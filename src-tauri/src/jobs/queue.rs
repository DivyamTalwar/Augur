use super::completion_handler::CompletionHandler;
use super::result_parser::JobMetadata;
use super::stream_processor::StreamProcessor;
use crate::db::{DbState, NewJob};
use crate::events;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, watch, Mutex, Semaphore};
use uuid::Uuid;

/// Entity type for tracking which kind of entity a job operates on
#[derive(Debug, Clone, Copy)]
pub enum EntityType {
    Lead,
    Person,
}

/// Context for entity status rollback on job failure
/// This allows us to reset entity status when jobs fail during queue timeout,
/// cancellation, or other early termination scenarios
#[derive(Debug, Clone)]
pub struct EntityContext {
    pub entity_type: EntityType,
    pub entity_id: i64,
    /// Status to set when job fails before starting (e.g., "pending" or "failed")
    pub rollback_status: String,
}

// Configuration
const MAX_CONCURRENT_JOB_PERMITS: usize = 9;
const QUEUE_TIMEOUT_SECS: u64 = 30;
const GRACEFUL_SHUTDOWN_SECS: u64 = 2; // Time to wait for graceful SIGTERM shutdown
const STREAM_DRAIN_TIMEOUT_SECS: u64 = 5; // Time to wait for stream tasks to complete
const SPECIALIST_LOG_POLL_MS: u64 = 750;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamEvent {
    pub job_id: String,
    pub event_type: String,
    pub content: String,
    pub timestamp: i64,
}

struct ActiveJob {
    cancel_tx: mpsc::Sender<()>,
    status: String,
}

/// RAII guard that ensures job cleanup on drop (including panics).
///
/// This guard ensures that:
/// 1. The job is removed from active_jobs HashMap
/// 2. Entity status is reset if entity_context is provided
/// 3. Job status is updated to "error" if not already completed
///
/// The guard is explicitly deactivated (using `defuse()`) when the job completes
/// normally, preventing the cleanup code from running in the success case.
struct JobGuard {
    job_id: String,
    active_jobs: Arc<Mutex<HashMap<String, ActiveJob>>>,
    db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,
    entity_context: Option<EntityContext>,
    defused: bool,
}

impl JobGuard {
    fn new(
        job_id: String,
        active_jobs: Arc<Mutex<HashMap<String, ActiveJob>>>,
        db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
        app_handle: AppHandle,
        entity_context: Option<EntityContext>,
    ) -> Self {
        Self {
            job_id,
            active_jobs,
            db_conn,
            app_handle,
            entity_context,
            defused: false,
        }
    }

    /// Defuse the guard - prevents cleanup code from running on drop.
    /// Call this when the job completes normally.
    fn defuse(&mut self) {
        self.defused = true;
    }
}

impl Drop for JobGuard {
    fn drop(&mut self) {
        if self.defused {
            return;
        }

        // We can't use async in drop, so we spawn a blocking task for cleanup
        eprintln!(
            "[job_queue] JobGuard drop triggered for job_id={} - cleaning up",
            self.job_id
        );

        let job_id = self.job_id.clone();
        let active_jobs = self.active_jobs.clone();
        let db_conn = self.db_conn.clone();
        let app_handle = self.app_handle.clone();
        let entity_context = self.entity_context.clone();

        // Use tokio's current runtime to spawn the cleanup task
        // Note: This will only work if dropped within a tokio context
        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            handle.spawn(async move {
                // Remove from active jobs
                active_jobs.lock().await.remove(&job_id);

                // Reset entity status if context provided
                if let Some(ref ctx) = entity_context {
                    db_reset_entity_status(&db_conn, ctx, &app_handle);
                }

                // Update job status to error
                db_update_job_status(
                    &db_conn,
                    &job_id,
                    "error",
                    None,
                    Some("Job aborted unexpectedly"),
                );
                crate::orchestration::cleanup_job_workspace(&app_handle, &job_id);
                events::emit_job_status_changed(&app_handle, job_id, "error".to_string(), None);
            });
        } else {
            // Fallback: synchronous cleanup (just the DB updates)
            eprintln!(
                "[job_queue] No tokio runtime available for async cleanup of job_id={}",
                self.job_id
            );

            // Reset entity status if context provided
            if let Some(ref ctx) = entity_context {
                db_reset_entity_status(&db_conn, ctx, &app_handle);
            }

            // Update job status to error
            db_update_job_status(
                &db_conn,
                &job_id,
                "error",
                None,
                Some("Job aborted unexpectedly"),
            );
            crate::orchestration::cleanup_job_workspace(&app_handle, &job_id);
        }
    }
}

/// Gracefully shutdown a child process: SIGTERM first, then SIGKILL if needed.
/// Always calls wait() to reap the process and avoid zombies.
async fn graceful_shutdown(mut child: Child, job_id: &str) {
    // Try SIGTERM first on Unix
    #[cfg(unix)]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;

        if let Some(pid) = child.id() {
            eprintln!(
                "[job_queue] job_id={} Sending SIGTERM to pid {}",
                job_id, pid
            );
            if let Err(e) = kill(Pid::from_raw(pid as i32), Signal::SIGTERM) {
                eprintln!("[job_queue] job_id={} SIGTERM failed: {}", job_id, e);
            }
        }
    }

    // Wait for graceful exit with timeout
    let graceful_result =
        tokio::time::timeout(Duration::from_secs(GRACEFUL_SHUTDOWN_SECS), child.wait()).await;

    match graceful_result {
        Ok(Ok(status)) => {
            eprintln!(
                "[job_queue] job_id={} Process exited gracefully with status: {:?}",
                job_id, status
            );
            return;
        }
        Ok(Err(e)) => {
            eprintln!(
                "[job_queue] job_id={} Error waiting for process: {}",
                job_id, e
            );
        }
        Err(_) => {
            eprintln!(
                "[job_queue] job_id={} Graceful shutdown timeout, sending SIGKILL",
                job_id
            );
        }
    }

    // Force kill if still running
    if let Err(e) = child.kill().await {
        eprintln!("[job_queue] job_id={} SIGKILL failed: {}", job_id, e);
    }

    // Always wait to reap zombie process
    match child.wait().await {
        Ok(status) => {
            eprintln!(
                "[job_queue] job_id={} Process reaped with status: {:?}",
                job_id, status
            );
        }
        Err(e) => {
            eprintln!("[job_queue] job_id={} Error reaping process: {}", job_id, e);
        }
    }
}

async fn tail_specialist_stream_logs(
    job_id: String,
    outputs_dir: PathBuf,
    mut stop_rx: watch::Receiver<bool>,
    on_event: Channel<StreamEvent>,
) {
    let mut offsets: HashMap<PathBuf, usize> = HashMap::new();

    loop {
        emit_specialist_stream_updates(&job_id, &outputs_dir, &mut offsets, &on_event);

        tokio::select! {
            _ = stop_rx.changed() => {
                emit_specialist_stream_updates(&job_id, &outputs_dir, &mut offsets, &on_event);
                break;
            }
            _ = tokio::time::sleep(Duration::from_millis(SPECIALIST_LOG_POLL_MS)) => {}
        }
    }
}

fn emit_specialist_stream_updates(
    job_id: &str,
    outputs_dir: &Path,
    offsets: &mut HashMap<PathBuf, usize>,
    on_event: &Channel<StreamEvent>,
) {
    for (agent, line) in read_specialist_stream_updates(outputs_dir, offsets) {
        let _ = on_event.send(StreamEvent {
            job_id: job_id.to_string(),
            event_type: "specialist".to_string(),
            content: format!("[{}] {}", agent, line),
            timestamp: chrono::Utc::now().timestamp_millis(),
        });
    }
}

fn read_specialist_stream_updates(
    outputs_dir: &Path,
    offsets: &mut HashMap<PathBuf, usize>,
) -> Vec<(String, String)> {
    let Ok(entries) = std::fs::read_dir(outputs_dir) else {
        return Vec::new();
    };

    let mut updates = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let Some(file_name) = path.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        let Some(agent) = file_name.strip_suffix(".stream.log") else {
            continue;
        };

        let Ok(content) = std::fs::read_to_string(&path) else {
            continue;
        };
        let previous_len = *offsets.get(&path).unwrap_or(&0);
        if content.len() < previous_len {
            offsets.insert(path.clone(), content.len());
            continue;
        }
        if content.len() == previous_len {
            continue;
        }

        let appended = &content[previous_len..];
        offsets.insert(path.clone(), content.len());
        for line in appended
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
        {
            updates.push((agent.to_string(), line.to_string()));
        }
    }

    updates
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn specialist_stream_updates_are_incremental() {
        let dir =
            std::env::temp_dir().join(format!("augur-specialist-log-test-{}", Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("pain-diagnostician.stream.log");
        let mut offsets = HashMap::new();

        std::fs::write(&path, "first note\n").unwrap();
        assert_eq!(
            read_specialist_stream_updates(&dir, &mut offsets),
            vec![("pain-diagnostician".to_string(), "first note".to_string())]
        );

        std::fs::write(&path, "first note\nsecond note\n").unwrap();
        assert_eq!(
            read_specialist_stream_updates(&dir, &mut offsets),
            vec![("pain-diagnostician".to_string(), "second note".to_string())]
        );
        assert!(read_specialist_stream_updates(&dir, &mut offsets).is_empty());

        let _ = std::fs::remove_dir_all(&dir);
    }
}

pub struct JobQueue {
    semaphore: Arc<Semaphore>,
    active_jobs: Arc<Mutex<HashMap<String, ActiveJob>>>,
}

impl JobQueue {
    pub fn new() -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_JOB_PERMITS)),
            active_jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Start a job with a completion callback that receives accumulated output
    /// Now also persists job state and logs to the database using StreamProcessor and CompletionHandler
    ///
    /// Settings (model, use_chrome) are read from the database at job execution time.
    ///
    /// If `entity_context` is provided, the entity's status will be reset on:
    /// - Queue timeout (semaphore acquisition fails after 30s)
    /// - Job cancellation before running
    /// - Any error before job starts
    pub async fn start_job_with_callback<F>(
        &self,
        app: AppHandle,
        prompt: String,
        working_dir: String,
        on_event: Channel<StreamEvent>,
        metadata: JobMetadata,
        entity_label: String,
        entity_context: Option<EntityContext>,
        on_complete: F,
    ) -> Result<String, String>
    where
        F: FnOnce(JobMetadata, String, bool) + Send + 'static,
    {
        let job_id = Uuid::new_v4().to_string();
        let semaphore = self.semaphore.clone();
        let active_jobs = self.active_jobs.clone();

        let (cancel_tx, mut cancel_rx) = mpsc::channel::<()>(1);

        // Register the job in memory
        {
            let mut jobs = active_jobs.lock().await;
            jobs.insert(
                job_id.clone(),
                ActiveJob {
                    cancel_tx,
                    status: "queued".to_string(),
                },
            );
        }

        // Persist job to database
        let job_type_str = match metadata.job_type {
            super::result_parser::JobType::CompanyResearch => "company_research",
            super::result_parser::JobType::PersonResearch => "person_research",
            super::result_parser::JobType::Scoring => "scoring",
            super::result_parser::JobType::Conversation => "conversation",
            super::result_parser::JobType::LeadFinder => "lead_finder",
        };

        // Read settings, prepare optional orchestration workspace, and persist job to database.
        let setup_result: Result<_, String> = {
            let db_state: tauri::State<'_, DbState> = app.state();
            let conn = db_state.conn.lock().map_err(|e| e.to_string())?;
            let settings = crate::db::get_settings(&conn).map_err(|e| e.to_string())?;
            let configured_depth = metadata
                .research_depth
                .as_deref()
                .map(crate::orchestration::ResearchDepth::from_name)
                .unwrap_or_else(|| crate::orchestration::ResearchDepth::from_settings(&settings));
            let execution_depth =
                if matches!(
                    metadata.job_type,
                    super::result_parser::JobType::CompanyResearch
                ) && crate::orchestration::should_orchestrate(&settings, configured_depth)
                {
                    configured_depth
                } else {
                    crate::orchestration::ResearchDepth::Light
                };

            let effective_working_dir = if execution_depth
                != crate::orchestration::ResearchDepth::Light
            {
                let prepared =
                    crate::orchestration::prepare_job_workspace(&app, &job_id, execution_depth)?;
                eprintln!(
                    "[job_queue] job_id={} Prepared orchestration workspace at {:?} with agents: {:?}",
                    job_id,
                    prepared.path,
                    prepared.agent_names
                );
                prepared.path.to_string_lossy().to_string()
            } else {
                working_dir.clone()
            };

            eprintln!(
                "[job_queue] job_id={} Using settings: model='claude-opus-4-6', effort='xhigh', use_chrome={}, depth={}",
                job_id,
                settings.use_chrome,
                execution_depth.as_str()
            );
            let new_job = NewJob {
                id: job_id.clone(),
                job_type: job_type_str.to_string(),
                entity_id: metadata.entity_id,
                entity_label: entity_label.clone(),
                prompt: prompt.clone(),
                model: Some("claude-opus-4-6".to_string()),
                working_dir: effective_working_dir.clone(),
                output_path: Some(metadata.primary_output_path.to_string_lossy().to_string()),
            };
            crate::db::insert_job(&conn, &new_job).map_err(|e| e.to_string())?;
            Ok((settings, effective_working_dir, execution_depth))
        };

        let (settings, effective_working_dir, execution_depth) = match setup_result {
            Ok(result) => result,
            Err(e) => {
                active_jobs.lock().await.remove(&job_id);
                return Err(e);
            }
        };

        // Emit job created event
        events::emit_job_created(
            &app,
            job_id.clone(),
            job_type_str.to_string(),
            metadata.entity_id,
            entity_label,
        );

        let job_id_clone = job_id.clone();
        let app_clone = app.clone();

        // Clone the database connection Arc for use in the spawned task
        let db_conn = {
            let db_state: tauri::State<'_, DbState> = app.state();
            db_state.conn.clone()
        };

        // Spawn the job task
        tokio::spawn(async move {
            // Create JobGuard for panic cleanup - will be defused on normal completion
            let mut job_guard = JobGuard::new(
                job_id_clone.clone(),
                active_jobs.clone(),
                db_conn.clone(),
                app_clone.clone(),
                entity_context.clone(),
            );

            // Clone variables for the update_job_status closure
            let job_id_for_status = job_id_clone.clone();
            let app_for_status = app_clone.clone();
            let db_conn_for_status = db_conn.clone();

            // Helper to update job status in DB and emit event
            let update_job_status =
                move |status: &str, exit_code: Option<i32>, error_msg: Option<&str>| {
                    db_update_job_status(
                        &db_conn_for_status,
                        &job_id_for_status,
                        status,
                        exit_code,
                        error_msg,
                    );
                    events::emit_job_status_changed(
                        &app_for_status,
                        job_id_for_status.clone(),
                        status.to_string(),
                        exit_code,
                    );
                };

            let job_weight = execution_depth.concurrency_weight(settings.deep_job_concurrency);
            let job_timeout_secs = execution_depth.timeout_secs();

            // Try to acquire weighted semaphore with queue timeout
            let permit = tokio::select! {
                permit = semaphore.acquire_many_owned(job_weight) => {
                    match permit {
                        Ok(p) => p,
                        Err(_) => {
                            let _ = on_event.send(StreamEvent {
                                job_id: job_id_clone.clone(),
                                event_type: "error".to_string(),
                                content: "Failed to acquire job slot".to_string(),
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            });
                                // Reset entity status on semaphore error
                                if let Some(ref ctx) = entity_context {
                                    db_reset_entity_status(&db_conn, ctx, &app_clone);
                                }
                                crate::orchestration::cleanup_job_workspace(&app_clone, &job_id_clone);
                                update_job_status("error", None, Some("Failed to acquire job slot"));
                            job_guard.defuse(); // Cleanup handled manually
                            on_complete(metadata, String::new(), false);
                            return;
                        }
                    }
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(QUEUE_TIMEOUT_SECS)) => {
                    let _ = on_event.send(StreamEvent {
                        job_id: job_id_clone.clone(),
                        event_type: "error".to_string(),
                        content: "Queue timeout - server busy".to_string(),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    });
                    active_jobs.lock().await.remove(&job_id_clone);
                    // Reset entity status on queue timeout
                        if let Some(ref ctx) = entity_context {
                            db_reset_entity_status(&db_conn, ctx, &app_clone);
                        }
                        crate::orchestration::cleanup_job_workspace(&app_clone, &job_id_clone);
                        update_job_status("error", None, Some("Queue timeout - server busy"));
                    job_guard.defuse(); // Cleanup handled manually
                    on_complete(metadata, String::new(), false);
                    return;
                }
                _ = cancel_rx.recv() => {
                    let _ = on_event.send(StreamEvent {
                        job_id: job_id_clone.clone(),
                        event_type: "cancelled".to_string(),
                        content: "Job cancelled while queued".to_string(),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    });
                    active_jobs.lock().await.remove(&job_id_clone);
                    // Reset entity status on cancellation while queued
                        if let Some(ref ctx) = entity_context {
                            db_reset_entity_status(&db_conn, ctx, &app_clone);
                        }
                        crate::orchestration::cleanup_job_workspace(&app_clone, &job_id_clone);
                        update_job_status("cancelled", None, Some("Cancelled while queued"));
                    job_guard.defuse(); // Cleanup handled manually
                    on_complete(metadata, String::new(), false);
                    return;
                }
            };

            // Update status to running
            {
                let mut jobs = active_jobs.lock().await;
                if let Some(job) = jobs.get_mut(&job_id_clone) {
                    job.status = "running".to_string();
                }
            }
            update_job_status("running", None, None);

            let _ = on_event.send(StreamEvent {
                job_id: job_id_clone.clone(),
                event_type: "started".to_string(),
                content: "Job started".to_string(),
                timestamp: chrono::Utc::now().timestamp_millis(),
            });

            // Find claude path
            let claude_path = find_claude_path().unwrap_or_else(|| "claude".to_string());

            // Build arguments using settings
            // Note: prompt must be last as it's a positional argument
            let mut args = vec![
                "-p".to_string(),
                "--output-format".to_string(),
                "stream-json".to_string(),
                "--verbose".to_string(),
                // This is a trusted local desktop workflow. Specialist `tools:` frontmatter
                // guides Claude's subagent behavior but is not an OS-level sandbox while the
                // parent Claude process is launched with skipped permission prompts.
                "--dangerously-skip-permissions".to_string(),
            ];

            // Add --chrome flag if enabled in settings
            if settings.use_chrome {
                args.push("--chrome".to_string());
            }

            // Lock every job to Opus 4.6 at xhigh reasoning effort.
            args.push("--model".to_string());
            args.push("claude-opus-4-6".to_string());
            args.push("--effort".to_string());
            args.push("xhigh".to_string());

            // Add prompt at the end (positional argument)
            args.push(prompt);

            // Debug: log the command being executed
            eprintln!(
                "[job_queue] job_id={} Executing: {} {}",
                job_id_clone,
                claude_path,
                args.join(" ")
            );

            // Spawn the process with kill_on_drop for safety
            let mut child = match Command::new(&claude_path)
                .args(&args)
                .current_dir(&effective_working_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .stdin(Stdio::null())
                .kill_on_drop(true) // Ensure process is killed if task panics
                .spawn()
            {
                Ok(c) => c,
                Err(e) => {
                    eprintln!(
                        "[job_queue] job_id={} Failed to spawn claude: {}",
                        job_id_clone, e
                    );
                    if let Err(send_err) = on_event.send(StreamEvent {
                        job_id: job_id_clone.clone(),
                        event_type: "error".to_string(),
                        content: format!("Failed to spawn claude: {}", e),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    }) {
                        eprintln!(
                            "[job_queue] job_id={} Failed to send error event: {}",
                            job_id_clone, send_err
                        );
                    }
                    active_jobs.lock().await.remove(&job_id_clone);
                    drop(permit);
                    // Reset entity status on spawn failure
                    if let Some(ref ctx) = entity_context {
                        db_reset_entity_status(&db_conn, ctx, &app_clone);
                    }
                    crate::orchestration::cleanup_job_workspace(&app_clone, &job_id_clone);
                    update_job_status(
                        "error",
                        None,
                        Some(&format!("Failed to spawn claude: {}", e)),
                    );
                    job_guard.defuse(); // Cleanup handled manually
                    on_complete(metadata, String::new(), false);
                    return;
                }
            };

            // Store PID in database
            if let Some(pid) = child.id() {
                db_update_job_pid(&db_conn, &job_id_clone, pid);
            }

            // Create StreamProcessor for unified stream handling
            let stream_processor =
                StreamProcessor::new(job_id_clone.clone(), db_conn.clone(), app_clone.clone());

            let specialist_tail = if execution_depth != crate::orchestration::ResearchDepth::Light {
                let outputs_dir = PathBuf::from(&effective_working_dir)
                    .join("outputs")
                    .join("specialists");
                let (tail_stop_tx, tail_stop_rx) = watch::channel(false);
                let tail_job_id = job_id_clone.clone();
                let tail_events = on_event.clone();
                Some((
                    tail_stop_tx,
                    tokio::spawn(tail_specialist_stream_logs(
                        tail_job_id,
                        outputs_dir,
                        tail_stop_rx,
                        tail_events,
                    )),
                ))
            } else {
                None
            };

            // Take stdout and stderr
            let stdout = child.stdout.take();
            let stderr = child.stderr.take();

            // Create handles for spawned tasks
            let processor_stdout = stream_processor.clone_for_task();
            let on_event_stdout = on_event.clone();
            let stdout_handle = tokio::spawn(async move {
                if let Some(stdout) = stdout {
                    let reader = BufReader::new(stdout);
                    let mut lines = reader.lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        processor_stdout
                            .process_stdout_line(line, &on_event_stdout)
                            .await;
                    }
                    // Flush any remaining buffered logs
                    processor_stdout.flush_buffer().await;
                }
            });

            // Stderr handler - NOW ALSO PERSISTED via StreamProcessor
            let processor_stderr = stream_processor.clone_for_task();
            let on_event_stderr = on_event.clone();
            let stderr_handle = tokio::spawn(async move {
                if let Some(stderr) = stderr {
                    let reader = BufReader::new(stderr);
                    let mut lines = reader.lines();
                    while let Ok(Some(line)) = lines.next_line().await {
                        processor_stderr
                            .process_stderr_line(line, &on_event_stderr)
                            .await;
                    }
                    // Flush any remaining buffered logs
                    processor_stderr.flush_buffer().await;
                }
            });

            // Wait for completion with timeout
            let result = tokio::select! {
                status = child.wait() => {
                    match status {
                        Ok(s) => {
                            let code = s.code().unwrap_or(-1);
                            eprintln!("[job_queue] job_id={} Process exited with code: {}", job_id_clone, code);
                            if code == 0 {
                                ("completed".to_string(), Some(code), true)
                            } else {
                                ("error".to_string(), Some(code), false)
                            }
                        }
                        Err(e) => {
                            eprintln!("[job_queue] job_id={} Process wait error: {}", job_id_clone, e);
                            ("error".to_string(), None, false)
                        }
                    }
                }
                _ = tokio::time::sleep(Duration::from_secs(job_timeout_secs)) => {
                    eprintln!("[job_queue] job_id={} Job timeout after {} seconds", job_id_clone, job_timeout_secs);
                    graceful_shutdown(child, &job_id_clone).await;
                    ("timeout".to_string(), None, false)
                }
                _ = cancel_rx.recv() => {
                    eprintln!("[job_queue] job_id={} Job cancelled by user", job_id_clone);
                    graceful_shutdown(child, &job_id_clone).await;
                    ("cancelled".to_string(), None, false)
                }
            };

            if let Some((tail_stop_tx, specialist_tail_handle)) = specialist_tail {
                let _ = tail_stop_tx.send(true);
                if let Err(_) = tokio::time::timeout(
                    Duration::from_secs(STREAM_DRAIN_TIMEOUT_SECS),
                    specialist_tail_handle,
                )
                .await
                {
                    eprintln!(
                        "[job_queue] job_id={} Specialist stream drain timeout",
                        job_id_clone
                    );
                }
            }

            // Wait for stream tasks to complete with timeout to prevent hanging
            if let Err(_) = tokio::time::timeout(
                Duration::from_secs(STREAM_DRAIN_TIMEOUT_SECS),
                stdout_handle,
            )
            .await
            {
                eprintln!(
                    "[job_queue] job_id={} Stdout stream drain timeout",
                    job_id_clone
                );
            }
            if let Err(_) = tokio::time::timeout(
                Duration::from_secs(STREAM_DRAIN_TIMEOUT_SECS),
                stderr_handle,
            )
            .await
            {
                eprintln!(
                    "[job_queue] job_id={} Stderr stream drain timeout",
                    job_id_clone
                );
            }

            // Finalize stream processor and get completion context
            let completion_ctx = stream_processor.finalize(result.2, result.1).await;

            // Update job status in database
            let error_msg = if !result.2 {
                Some(format!("Job {} with code {:?}", result.0, result.1))
            } else {
                None
            };
            update_job_status(&result.0, result.1, error_msg.as_deref());

            // Send completion event
            if let Err(e) = on_event.send(StreamEvent {
                job_id: job_id_clone.clone(),
                event_type: result.0.clone(),
                content: format!("Job {} with code {:?}", result.0, result.1),
                timestamp: chrono::Utc::now().timestamp_millis(),
            }) {
                eprintln!(
                    "[job_queue] job_id={} Failed to send completion event: {}",
                    job_id_clone, e
                );
            }

            // Process completion atomically using CompletionHandler
            let completion_handler = CompletionHandler::new(db_conn.clone(), app_clone.clone());
            if let Err(e) = completion_handler
                .process_completion(&completion_ctx, &metadata)
                .await
            {
                eprintln!(
                    "[job_queue] job_id={} Completion handler error: {}",
                    job_id_clone, e
                );
                // Mark entity as failed when completion handler errors
                completion_handler.mark_entity_failed(&metadata);
                // Update job status to error
                db_update_job_status(
                    &db_conn,
                    &job_id_clone,
                    "error",
                    None,
                    Some(&format!("Completion handler error: {}", e)),
                );
                // Emit entity updated event so frontend updates
                match metadata.job_type {
                    super::result_parser::JobType::CompanyResearch => {
                        events::emit_lead_updated(&app_clone, metadata.entity_id);
                    }
                    super::result_parser::JobType::PersonResearch
                    | super::result_parser::JobType::Conversation => {
                        // Get lead_id for the person to emit person-updated event
                        if let Ok(conn) = db_conn.lock() {
                            if let Ok(Some(person)) =
                                crate::db::get_person_raw(&conn, metadata.entity_id)
                            {
                                events::emit_person_updated(
                                    &app_clone,
                                    metadata.entity_id,
                                    person.lead_id,
                                );
                            }
                        }
                    }
                    super::result_parser::JobType::Scoring => {
                        events::emit_lead_updated(&app_clone, metadata.entity_id);
                    }
                    super::result_parser::JobType::LeadFinder => {
                        // No specific entity to update
                    }
                }
            }
            crate::orchestration::cleanup_job_workspace(&app_clone, &job_id_clone);

            // Cleanup active jobs
            active_jobs.lock().await.remove(&job_id_clone);
            drop(permit);

            // Defuse the guard - we're completing normally
            job_guard.defuse();

            // Call the completion callback with accumulated stdout
            on_complete(metadata, completion_ctx.accumulated_stdout, result.2);
        });

        Ok(job_id)
    }

    pub async fn kill_job(&self, job_id: &str) -> Result<(), String> {
        eprintln!("[job_queue] Attempting to kill job_id={}", job_id);
        let mut jobs = self.active_jobs.lock().await;
        if let Some(job) = jobs.remove(job_id) {
            if let Err(e) = job.cancel_tx.send(()).await {
                eprintln!(
                    "[job_queue] job_id={} Failed to send cancel signal: {}",
                    job_id, e
                );
            }
            Ok(())
        } else {
            Err("Job not found".to_string())
        }
    }

    pub async fn get_active_jobs(&self) -> Vec<String> {
        let jobs = self.active_jobs.lock().await;
        jobs.keys().cloned().collect()
    }
}

// Helper functions for database operations that work with Arc<Mutex<Connection>>
fn db_update_job_status(
    conn: &Arc<std::sync::Mutex<rusqlite::Connection>>,
    job_id: &str,
    status: &str,
    exit_code: Option<i32>,
    error_msg: Option<&str>,
) {
    if let Ok(conn) = conn.lock() {
        let _ = crate::db::update_job_status(&conn, job_id, status, exit_code, error_msg);
    }
}

fn db_update_job_pid(conn: &Arc<std::sync::Mutex<rusqlite::Connection>>, job_id: &str, pid: u32) {
    if let Ok(conn) = conn.lock() {
        let _ = crate::db::update_job_pid(&conn, job_id, pid);
    }
}

/// Reset entity status when job fails early (queue timeout, cancellation, etc.)
fn db_reset_entity_status(
    conn: &Arc<std::sync::Mutex<rusqlite::Connection>>,
    entity_ctx: &EntityContext,
    app: &AppHandle,
) {
    if let Ok(conn) = conn.lock() {
        let result = match entity_ctx.entity_type {
            EntityType::Lead => conn.execute(
                "UPDATE leads SET research_status = ?1 WHERE id = ?2",
                rusqlite::params![entity_ctx.rollback_status, entity_ctx.entity_id],
            ),
            EntityType::Person => conn.execute(
                "UPDATE people SET research_status = ?1 WHERE id = ?2",
                rusqlite::params![entity_ctx.rollback_status, entity_ctx.entity_id],
            ),
        };
        if let Err(e) = result {
            eprintln!("[job_queue] Failed to reset entity status: {}", e);
        } else {
            // Emit event to notify frontend of status change
            match entity_ctx.entity_type {
                EntityType::Lead => {
                    events::emit_lead_updated(app, entity_ctx.entity_id);
                }
                EntityType::Person => {
                    // Get lead_id for person-updated event
                    if let Ok(Some(person)) = crate::db::get_person_raw(&conn, entity_ctx.entity_id)
                    {
                        events::emit_person_updated(app, entity_ctx.entity_id, person.lead_id);
                    }
                }
            }
        }
    }
}

fn find_claude_path() -> Option<String> {
    // Check environment variable first
    if let Ok(path) = std::env::var("CLAUDE_PATH") {
        if std::path::Path::new(&path).exists() {
            return Some(path);
        }
    }

    // Use a login shell to find claude - this loads the user's profile and full PATH
    // Only use -l (login), not -i (interactive) to avoid extra output
    for shell in &["/bin/zsh", "/bin/bash"] {
        if let Ok(output) = std::process::Command::new(shell)
            .args(["-lc", "which claude"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&output.stderr);
            eprintln!(
                "[job_queue] {} -lc 'which claude': status={}, stdout='{}', stderr='{}'",
                shell, output.status, stdout, stderr
            );

            if output.status.success()
                && !stdout.is_empty()
                && std::path::Path::new(&stdout).exists()
            {
                eprintln!("[job_queue] Found claude at: {}", stdout);
                return Some(stdout);
            }
        }
    }

    eprintln!("[job_queue] Could not find claude CLI");
    None
}
