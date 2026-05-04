//! Completion handler for processing job results atomically
//!
//! This module handles the completion of jobs with proper error handling
//! and atomic operations. It processes job results in phases:
//! 1. Verify output files exist and are readable
//! 2. Parse and validate content
//! 3. Update database records (in a transaction)
//! 4. Cleanup output files only after DB is confirmed
//! 5. Record completion state for recovery

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;

use super::enrichment::{LeadEnrichment, PersonEnrichment};
use super::result_parser::{JobMetadata, JobType};
use super::stream_processor::CompletionContext;
use crate::db;
use crate::events;

/// Completion phases for recovery tracking
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CompletionPhase {
    Started,
    FilesVerified,
    ContentParsed,
    DatabaseUpdated,
    FilesCleanedUp,
    Completed,
    Failed,
}

/// Error types for completion handling
#[derive(Debug)]
pub enum CompletionError {
    FileNotFound(PathBuf),
    FileReadError(PathBuf, std::io::Error),
    ParseError(String),
    DatabaseError(String),
    ValidationError(String),
}

impl std::fmt::Display for CompletionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CompletionError::FileNotFound(path) => write!(f, "Output file not found: {:?}", path),
            CompletionError::FileReadError(path, e) => {
                write!(f, "Failed to read {:?}: {}", path, e)
            }
            CompletionError::ParseError(msg) => write!(f, "Parse error: {}", msg),
            CompletionError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            CompletionError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
        }
    }
}

/// Verified output files
pub struct VerifiedOutputs {
    pub primary_content: String,
    pub secondary_content: Option<String>,
    pub enrichment_content: Option<String>,
}

/// Parsed output content based on job type
pub enum ParsedOutput {
    CompanyResearch {
        profile: String,
        people: Option<Vec<serde_json::Value>>,
        enrichment: Option<LeadEnrichment>,
    },
    PersonResearch {
        profile: String,
        enrichment: Option<PersonEnrichment>,
    },
    Scoring {
        score_data: serde_json::Value,
    },
    Conversation {
        topics: String,
    },
    LeadFinder {
        leads: Vec<serde_json::Value>,
    },
}

/// Handles job completion with atomic operations
pub struct CompletionHandler {
    db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
    app_handle: AppHandle,
}

impl CompletionHandler {
    pub fn new(
        db_conn: Arc<std::sync::Mutex<rusqlite::Connection>>,
        app_handle: AppHandle,
    ) -> Self {
        Self {
            db_conn,
            app_handle,
        }
    }

    /// Process job completion through all phases
    pub async fn process_completion(
        &self,
        ctx: &CompletionContext,
        metadata: &JobMetadata,
    ) -> Result<(), CompletionError> {
        let result: Result<(), CompletionError> = async {
            // Update completion state: started
            self.update_completion_state(&ctx.job_id, CompletionPhase::Started);

            // If job failed, mark entity as failed and remove partial/stale artifacts.
            if !ctx.success {
                self.mark_entity_failed(metadata);
                self.cleanup_files(metadata)?;
                self.update_completion_state(&ctx.job_id, CompletionPhase::Failed);
                return Ok(());
            }

            // Phase 1: Verify output files
            let outputs = self.verify_output_files(metadata)?;
            self.update_completion_state(&ctx.job_id, CompletionPhase::FilesVerified);

            // Phase 2: Parse and validate content
            let parsed = self.parse_output_content(&outputs, metadata, ctx).await?;
            self.update_completion_state(&ctx.job_id, CompletionPhase::ContentParsed);

            // Phase 3: Update database
            self.update_database(&parsed, metadata)?;
            self.update_completion_state(&ctx.job_id, CompletionPhase::DatabaseUpdated);

            // Phase 4: Cleanup files (only after DB is confirmed)
            self.cleanup_files(metadata)?;
            self.update_completion_state(&ctx.job_id, CompletionPhase::FilesCleanedUp);

            // Phase 5: Emit events and mark complete
            self.emit_completion_events(metadata);
            self.update_completion_state(&ctx.job_id, CompletionPhase::Completed);

            Ok(())
        }
        .await;

        if result.is_err() {
            self.mark_entity_failed(metadata);
            if let Err(e) = self.cleanup_files(metadata) {
                eprintln!(
                    "[completion_handler] Warning: Failed to cleanup after completion error: {}",
                    e
                );
            }
            self.update_completion_state(&ctx.job_id, CompletionPhase::Failed);
        }

        result
    }

    /// Verify that output files exist and are readable
    fn verify_output_files(
        &self,
        metadata: &JobMetadata,
    ) -> Result<VerifiedOutputs, CompletionError> {
        verify_output_files_for_metadata(metadata)
    }

    /// Parse output content based on job type
    async fn parse_output_content(
        &self,
        outputs: &VerifiedOutputs,
        metadata: &JobMetadata,
        ctx: &CompletionContext,
    ) -> Result<ParsedOutput, CompletionError> {
        match metadata.job_type {
            JobType::CompanyResearch => {
                let people_json = outputs.secondary_content.as_ref().ok_or_else(|| {
                    CompletionError::ValidationError(
                        "Company research completed without required people.json".to_string(),
                    )
                })?;
                let parsed_people = parse_company_people_json(people_json)?;
                let people = Some(
                    crate::apollo::enrich_people_json(
                        self.db_conn.clone(),
                        &ctx.job_id,
                        metadata.entity_id,
                        parsed_people,
                    )
                    .await,
                );

                // Parse enrichment data (optional)
                let enrichment = if let Some(ref enrichment_json) = outputs.enrichment_content {
                    match serde_json::from_str::<LeadEnrichment>(enrichment_json) {
                        Ok(e) => Some(e),
                        Err(e) => {
                            eprintln!("[completion_handler] Warning: Failed to parse lead enrichment JSON: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                Ok(ParsedOutput::CompanyResearch {
                    profile: outputs.primary_content.clone(),
                    people,
                    enrichment,
                })
            }
            JobType::PersonResearch => {
                // Parse enrichment data (optional)
                let enrichment = if let Some(ref enrichment_json) = outputs.enrichment_content {
                    match serde_json::from_str::<PersonEnrichment>(enrichment_json) {
                        Ok(e) => Some(e),
                        Err(e) => {
                            eprintln!("[completion_handler] Warning: Failed to parse person enrichment JSON: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                Ok(ParsedOutput::PersonResearch {
                    profile: outputs.primary_content.clone(),
                    enrichment,
                })
            }
            JobType::Scoring => {
                let score_data: serde_json::Value = serde_json::from_str(&outputs.primary_content)
                    .map_err(|e| {
                        CompletionError::ParseError(format!("Invalid score JSON: {}", e))
                    })?;

                // Validate required fields
                if score_data.get("passesRequirements").is_none() {
                    return Err(CompletionError::ValidationError(
                        "Score JSON missing 'passesRequirements' field".to_string(),
                    ));
                }

                Ok(ParsedOutput::Scoring { score_data })
            }
            JobType::Conversation => Ok(ParsedOutput::Conversation {
                topics: outputs.primary_content.clone(),
            }),
            JobType::LeadFinder => {
                let leads: Vec<serde_json::Value> = serde_json::from_str(&outputs.primary_content)
                    .map_err(|e| {
                        CompletionError::ParseError(format!("Invalid leads JSON: {}", e))
                    })?;
                Ok(ParsedOutput::LeadFinder { leads })
            }
        }
    }

    /// Update database with parsed output (wrapped in a transaction for atomicity)
    fn update_database(
        &self,
        parsed: &ParsedOutput,
        metadata: &JobMetadata,
    ) -> Result<(), CompletionError> {
        let mut conn = self.db_conn.lock().map_err(|e| {
            CompletionError::DatabaseError(format!("Failed to lock database: {}", e))
        })?;

        // Start a transaction for atomic updates
        let tx = conn.transaction().map_err(|e| {
            CompletionError::DatabaseError(format!("Failed to start transaction: {}", e))
        })?;

        let result = self.update_database_in_tx(&tx, parsed, metadata);

        match result {
            Ok(()) => {
                tx.commit().map_err(|e| {
                    CompletionError::DatabaseError(format!("Failed to commit transaction: {}", e))
                })?;
                Ok(())
            }
            Err(e) => {
                // Transaction will be rolled back on drop
                eprintln!(
                    "[completion_handler] Transaction rolled back due to error: {}",
                    e
                );
                Err(e)
            }
        }
    }

    /// Internal: update database within a transaction
    fn update_database_in_tx(
        &self,
        tx: &rusqlite::Transaction,
        parsed: &ParsedOutput,
        metadata: &JobMetadata,
    ) -> Result<(), CompletionError> {
        match parsed {
            ParsedOutput::CompanyResearch {
                profile,
                people,
                enrichment,
            } => {
                let lead_id = metadata.entity_id;

                // Merge people if available. Company reruns must not destroy existing person IDs,
                // user status, researched profiles, or generated conversation topics.
                if let Some(people_data) = people {
                    upsert_company_people(tx, lead_id, people_data)?;
                }

                // Update lead with company profile
                let now = chrono::Utc::now().timestamp_millis();
                tx.execute(
                    "UPDATE leads SET research_status = ?1, company_profile = ?2, researched_at = ?3 WHERE id = ?4",
                    rusqlite::params!["completed", profile, now, lead_id],
                ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;

                // Apply enrichment data if available (only updates NULL fields)
                if let Some(e) = enrichment {
                    db::enrich_lead(tx, lead_id, e)
                        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }
            }
            ParsedOutput::PersonResearch {
                profile,
                enrichment,
            } => {
                let person_id = metadata.entity_id;
                let now = chrono::Utc::now().timestamp_millis();
                tx.execute(
                    "UPDATE people SET research_status = ?1, person_profile = ?2, researched_at = ?3 WHERE id = ?4",
                    rusqlite::params!["completed", profile, now, person_id],
                ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;

                // Apply enrichment data if available (only updates NULL fields)
                if let Some(e) = enrichment {
                    db::enrich_person(tx, person_id, e)
                        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
                }
            }
            ParsedOutput::Scoring { score_data } => {
                let lead_id = metadata.entity_id;

                // Get active config (read operation, safe outside transaction scope)
                let config: db::ParsedScoringConfig = tx
                    .query_row(
                        "SELECT id, name, is_active, required_characteristics, demand_signifiers,
                            tier_hot_min, tier_warm_min, tier_nurture_min, created_at, updated_at
                     FROM scoring_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1",
                        [],
                        |row| {
                            let required_chars: String = row.get(3)?;
                            let demand_sigs: String = row.get(4)?;
                            Ok(db::ParsedScoringConfig {
                                id: row.get(0)?,
                                name: row.get(1)?,
                                is_active: row.get(2)?,
                                required_characteristics: serde_json::from_str(&required_chars)
                                    .unwrap_or(serde_json::Value::Array(vec![])),
                                demand_signifiers: serde_json::from_str(&demand_sigs)
                                    .unwrap_or(serde_json::Value::Array(vec![])),
                                tier_hot_min: row.get(5)?,
                                tier_warm_min: row.get(6)?,
                                tier_nurture_min: row.get(7)?,
                                created_at: row.get(8)?,
                                updated_at: row.get(9)?,
                            })
                        },
                    )
                    .map_err(|e| match e {
                        rusqlite::Error::QueryReturnedNoRows => CompletionError::ValidationError(
                            "No active scoring configuration".to_string(),
                        ),
                        _ => CompletionError::DatabaseError(e.to_string()),
                    })?;

                let passes_requirements = score_data
                    .get("passesRequirements")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                let requirement_results = score_data
                    .get("requirementResults")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".to_string());

                let total_score = score_data
                    .get("totalScore")
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0);

                let score_breakdown = score_data
                    .get("scoreBreakdown")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".to_string());

                let tier = score_data
                    .get("tier")
                    .and_then(|v| v.as_str())
                    .unwrap_or("disqualified")
                    .to_string();

                let scoring_notes = score_data.get("scoringNotes").and_then(|v| v.as_str());

                let now = chrono::Utc::now().timestamp_millis();

                // Delete existing scores for this lead
                tx.execute(
                    "DELETE FROM lead_scores WHERE lead_id = ?1",
                    rusqlite::params![lead_id],
                )
                .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;

                // Insert new score
                tx.execute(
                    "INSERT INTO lead_scores (lead_id, config_id, passes_requirements, requirement_results,
                     total_score, score_breakdown, tier, scoring_notes, scored_at, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    rusqlite::params![lead_id, config.id, passes_requirements, requirement_results,
                                      total_score, score_breakdown, tier, scoring_notes, now, now],
                ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
            }
            ParsedOutput::Conversation { topics } => {
                let person_id = metadata.entity_id;
                let now = chrono::Utc::now().timestamp_millis();
                tx.execute(
                    "UPDATE people SET conversation_topics = ?1, conversation_generated_at = ?2 WHERE id = ?3",
                    rusqlite::params![topics, now, person_id],
                ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
            }
            ParsedOutput::LeadFinder { leads } => {
                let now = chrono::Utc::now().timestamp_millis();
                for lead_data in leads {
                    let company_name = lead_data
                        .get("companyName")
                        .and_then(|v| v.as_str())
                        .unwrap_or("Unknown");
                    let website = lead_data.get("website").and_then(|v| v.as_str());
                    let city = lead_data.get("city").and_then(|v| v.as_str());
                    let state = lead_data.get("state").and_then(|v| v.as_str());
                    let country = lead_data.get("country").and_then(|v| v.as_str());
                    let industry = lead_data.get("industry").and_then(|v| v.as_str());

                    tx.execute(
                        "INSERT INTO leads (company_name, website, city, state, country, industry, research_status, user_status, created_at)
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', 'new', ?7)",
                        rusqlite::params![company_name, website, city, state, country, industry, now],
                    ).map_err(|e| CompletionError::DatabaseError(e.to_string()))?;

                    let lead_id = tx.last_insert_rowid();
                    // Emit lead-created event so frontend updates incrementally
                    events::emit_lead_created(&self.app_handle, lead_id);
                }
            }
        }

        Ok(())
    }

    /// Cleanup output files after database is confirmed updated
    fn cleanup_files(&self, metadata: &JobMetadata) -> Result<(), CompletionError> {
        cleanup_output_files(metadata)
    }

    /// Emit completion events for frontend cache invalidation
    fn emit_completion_events(&self, metadata: &JobMetadata) {
        match metadata.job_type {
            JobType::CompanyResearch => {
                events::emit_lead_updated(&self.app_handle, metadata.entity_id);
                events::emit_people_bulk_created(&self.app_handle, metadata.entity_id);
            }
            JobType::PersonResearch => {
                // Get lead_id for the person
                if let Ok(conn) = self.db_conn.lock() {
                    if let Ok(Some(person)) = db::get_person_raw(&conn, metadata.entity_id) {
                        events::emit_person_updated(
                            &self.app_handle,
                            metadata.entity_id,
                            person.lead_id,
                        );
                    }
                }
            }
            JobType::Scoring => {
                events::emit_lead_scored(&self.app_handle, metadata.entity_id);
            }
            JobType::Conversation => {
                if let Ok(conn) = self.db_conn.lock() {
                    if let Ok(Some(person)) = db::get_person_raw(&conn, metadata.entity_id) {
                        events::emit_person_updated(
                            &self.app_handle,
                            metadata.entity_id,
                            person.lead_id,
                        );
                    }
                }
            }
            JobType::LeadFinder => {
                // Events already emitted per-lead during insert in update_database_in_tx
            }
        }
    }

    /// Mark entity as failed when job fails
    pub fn mark_entity_failed(&self, metadata: &JobMetadata) {
        if let Ok(conn) = self.db_conn.lock() {
            match metadata.job_type {
                JobType::CompanyResearch => {
                    let _ = conn.execute(
                        "UPDATE leads SET research_status = 'failed' WHERE id = ?1",
                        rusqlite::params![metadata.entity_id],
                    );
                }
                JobType::PersonResearch => {
                    let _ = conn.execute(
                        "UPDATE people SET research_status = 'failed' WHERE id = ?1",
                        rusqlite::params![metadata.entity_id],
                    );
                }
                JobType::Scoring | JobType::Conversation | JobType::LeadFinder => {
                    // No status field to update for these types
                }
            }
        }
    }

    /// Update completion state in database for recovery
    fn update_completion_state(&self, job_id: &str, phase: CompletionPhase) {
        let state_str = serde_json::to_string(&phase).ok();
        if let Ok(conn) = self.db_conn.lock() {
            let _ = db::update_job_completion_state(&conn, job_id, state_str.as_deref());
        }
    }
}

fn verify_output_files_for_metadata(
    metadata: &JobMetadata,
) -> Result<VerifiedOutputs, CompletionError> {
    let primary_path = &metadata.primary_output_path;

    // Check primary file exists
    if !primary_path.exists() {
        return Err(CompletionError::FileNotFound(primary_path.clone()));
    }

    // Read primary content
    let primary_content = fs::read_to_string(primary_path)
        .map_err(|e| CompletionError::FileReadError(primary_path.clone(), e))?;

    // Validate primary content is not empty
    if primary_content.trim().is_empty() {
        return Err(CompletionError::ValidationError(format!(
            "Primary output file is empty: {:?}",
            primary_path
        )));
    }

    // Read secondary content if path provided
    let secondary_content = if let Some(secondary_path) = &metadata.secondary_output_path {
        if secondary_path.exists() {
            let content = fs::read_to_string(secondary_path)
                .map_err(|e| CompletionError::FileReadError(secondary_path.clone(), e))?;
            if matches!(metadata.job_type, JobType::CompanyResearch) && content.trim().is_empty() {
                return Err(CompletionError::ValidationError(format!(
                    "Company people output file is empty: {:?}",
                    secondary_path
                )));
            }
            Some(content)
        } else if matches!(metadata.job_type, JobType::CompanyResearch) {
            return Err(CompletionError::FileNotFound(secondary_path.clone()));
        } else {
            None
        }
    } else {
        None
    };

    // Read enrichment content if path provided (optional, don't fail if missing)
    let enrichment_content = if let Some(enrichment_path) = &metadata.enrichment_output_path {
        if enrichment_path.exists() {
            match fs::read_to_string(enrichment_path) {
                Ok(content) => Some(content),
                Err(e) => {
                    eprintln!(
                        "[completion_handler] Warning: Failed to read enrichment file {:?}: {}",
                        enrichment_path, e
                    );
                    None
                }
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok(VerifiedOutputs {
        primary_content,
        secondary_content,
        enrichment_content,
    })
}

fn parse_company_people_json(people_json: &str) -> Result<Vec<serde_json::Value>, CompletionError> {
    serde_json::from_str::<Vec<serde_json::Value>>(people_json)
        .map_err(|e| CompletionError::ParseError(format!("people.json: {}", e)))
}

/// Helper to extract first name from people JSON
fn upsert_company_people(
    tx: &rusqlite::Transaction,
    lead_id: i64,
    people_data: &[serde_json::Value],
) -> Result<(), CompletionError> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut retained_ids = Vec::with_capacity(people_data.len());

    for p in people_data {
        let first_name = extract_first_name(p);
        let last_name = extract_last_name(p);
        let email = optional_str(p, "email");
        let email_source = optional_str(p, "emailSource");
        let email_status = optional_str(p, "emailStatus");
        let apollo_person_id = optional_str(p, "apolloPersonId");
        let title = optional_str(p, "title");
        let linkedin_url = optional_str(p, "linkedinUrl");
        let management_level = optional_str(p, "managementLevel");
        let year_joined = p.get("yearJoined").and_then(|v| v.as_i64());

        if let Some(existing_id) = find_existing_person_id(
            tx,
            lead_id,
            apollo_person_id.as_deref(),
            linkedin_url.as_deref(),
            &first_name,
            &last_name,
            title.as_deref(),
        )? {
            tx.execute(
                "UPDATE people
                 SET first_name = ?1,
                     last_name = ?2,
                     email = CASE
                         WHEN (email IS NULL OR trim(email) = '') AND ?3 IS NOT NULL THEN ?3
                         ELSE email
                     END,
                     email_source = CASE
                         WHEN (email_source IS NULL OR trim(email_source) = '') AND (email IS NULL OR trim(email) = '') AND ?3 IS NOT NULL THEN ?4
                         ELSE email_source
                     END,
                     email_status = CASE
                         WHEN (email_status IS NULL OR trim(email_status) = '') AND (email IS NULL OR trim(email) = '') AND ?3 IS NOT NULL THEN ?5
                         ELSE email_status
                     END,
                     apollo_person_id = COALESCE(NULLIF(apollo_person_id, ''), ?6),
                     title = COALESCE(?7, title),
                     linkedin_url = COALESCE(?8, linkedin_url),
                     management_level = COALESCE(?9, management_level),
                     year_joined = COALESCE(?10, year_joined)
                 WHERE id = ?11",
                rusqlite::params![
                    first_name,
                    last_name,
                    email,
                    email_source,
                    email_status,
                    apollo_person_id,
                    title,
                    linkedin_url,
                    management_level,
                    year_joined,
                    existing_id
                ],
            )
            .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
            retained_ids.push(existing_id);
        } else {
            tx.execute(
                "INSERT INTO people (
                    first_name, last_name, email, email_source, email_status,
                    apollo_person_id, title, linkedin_url, management_level,
                    year_joined, lead_id, research_status, user_status, created_at
                 )
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'pending', 'new', ?12)",
                rusqlite::params![
                    first_name,
                    last_name,
                    email,
                    email_source,
                    email_status,
                    apollo_person_id,
                    title,
                    linkedin_url,
                    management_level,
                    year_joined,
                    lead_id,
                    now
                ],
            )
            .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
            retained_ids.push(tx.last_insert_rowid());
        }
    }

    delete_people_omitted_by_latest_research(tx, lead_id, &retained_ids)?;
    Ok(())
}

fn delete_people_omitted_by_latest_research(
    tx: &rusqlite::Transaction,
    lead_id: i64,
    retained_ids: &[i64],
) -> Result<(), CompletionError> {
    if retained_ids.is_empty() {
        tx.execute(
            "DELETE FROM people WHERE lead_id = ?1",
            rusqlite::params![lead_id],
        )
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
        return Ok(());
    }

    let placeholders = std::iter::repeat_n("?", retained_ids.len())
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "DELETE FROM people WHERE lead_id = ? AND id NOT IN ({})",
        placeholders
    );
    let params = std::iter::once(lead_id).chain(retained_ids.iter().copied());
    tx.execute(&sql, rusqlite::params_from_iter(params))
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
    Ok(())
}

fn find_existing_person_id(
    tx: &rusqlite::Transaction,
    lead_id: i64,
    apollo_person_id: Option<&str>,
    linkedin_url: Option<&str>,
    first_name: &str,
    last_name: &str,
    title: Option<&str>,
) -> Result<Option<i64>, CompletionError> {
    if let Some(apollo_person_id) = apollo_person_id.filter(|value| !value.trim().is_empty()) {
        if let Some(id) = unique_person_id(
            tx,
            "SELECT id FROM people WHERE lead_id = ?1 AND apollo_person_id = ?2 LIMIT 2",
            rusqlite::params![lead_id, apollo_person_id],
        )? {
            return Ok(Some(id));
        }
    }

    if let Some(linkedin_url) = linkedin_url.filter(|value| !value.trim().is_empty()) {
        if let Some(id) = unique_person_id(
            tx,
            "SELECT id FROM people WHERE lead_id = ?1 AND lower(linkedin_url) = lower(?2) LIMIT 2",
            rusqlite::params![lead_id, linkedin_url],
        )? {
            return Ok(Some(id));
        }
    }

    let name_only_ids = matching_person_ids(
        tx,
        "SELECT id FROM people
         WHERE lead_id = ?1
           AND lower(first_name) = lower(?2)
           AND lower(last_name) = lower(?3)
         LIMIT 2",
        vec![
            lead_id.to_string(),
            first_name.to_string(),
            last_name.to_string(),
        ],
    )?;
    if name_only_ids.len() == 1 {
        return Ok(Some(name_only_ids[0]));
    }

    let Some(title) = title.filter(|value| !value.trim().is_empty()) else {
        return Ok(None);
    };
    let title_ids = matching_person_ids(
        tx,
        "SELECT id FROM people
         WHERE lead_id = ?1
           AND lower(first_name) = lower(?2)
           AND lower(last_name) = lower(?3)
           AND lower(COALESCE(title, '')) = lower(?4)
         LIMIT 2",
        vec![
            lead_id.to_string(),
            first_name.to_string(),
            last_name.to_string(),
            title.to_string(),
        ],
    )?;
    // `.then_some(title_ids[0])` would panic on len 0 (eager arg eval).
    Ok((title_ids.len() == 1).then(|| title_ids[0]))
}

fn matching_person_ids(
    tx: &rusqlite::Transaction,
    sql: &str,
    params: Vec<String>,
) -> Result<Vec<i64>, CompletionError> {
    let mut stmt = tx
        .prepare(sql)
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            row.get::<_, i64>(0)
        })
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))
}

fn unique_person_id<P>(
    tx: &rusqlite::Transaction,
    sql: &str,
    params: P,
) -> Result<Option<i64>, CompletionError>
where
    P: rusqlite::Params,
{
    let mut stmt = tx
        .prepare(sql)
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
    let ids = stmt
        .query_map(params, |row| row.get::<_, i64>(0))
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| CompletionError::DatabaseError(e.to_string()))?;
    // `.then_some(ids[0])` would panic on len 0 (eager arg eval), so use `.then(|| ...)`
    Ok((ids.len() == 1).then(|| ids[0]))
}

fn optional_str(p: &serde_json::Value, key: &str) -> Option<String> {
    p.get(key)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn extract_first_name(p: &serde_json::Value) -> String {
    if let Some(fn_val) = p.get("firstName").and_then(|v| v.as_str()) {
        fn_val.to_string()
    } else if let Some(name) = p.get("name").and_then(|v| v.as_str()) {
        let parts: Vec<&str> = name.split_whitespace().collect();
        parts.first().unwrap_or(&"Unknown").to_string()
    } else {
        "Unknown".to_string()
    }
}

/// Helper to extract last name from people JSON
fn extract_last_name(p: &serde_json::Value) -> String {
    if let Some(ln_val) = p.get("lastName").and_then(|v| v.as_str()) {
        ln_val.to_string()
    } else if let Some(name) = p.get("name").and_then(|v| v.as_str()) {
        let parts: Vec<&str> = name.split_whitespace().collect();
        parts.get(1..).unwrap_or(&[]).join(" ")
    } else {
        String::new()
    }
}

fn cleanup_output_files(metadata: &JobMetadata) -> Result<(), CompletionError> {
    let primary_path = &metadata.primary_output_path;

    // For research jobs, delete the entire directory because the prompt writes
    // a coordinated artifact set there. Leaving one stale file can corrupt a rerun.
    if matches!(
        metadata.job_type,
        JobType::CompanyResearch | JobType::PersonResearch
    ) {
        if let Some(parent) = primary_path.parent() {
            if parent.exists() {
                if let Err(e) = fs::remove_dir_all(parent) {
                    eprintln!(
                        "[completion_handler] Warning: Failed to cleanup directory {:?}: {}",
                        parent, e
                    );
                }
            }
        }
    } else if primary_path.exists() {
        // For other jobs, just delete the output file.
        if let Err(e) = fs::remove_file(primary_path) {
            eprintln!(
                "[completion_handler] Warning: Failed to cleanup file {:?}: {}",
                primary_path, e
            );
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use serde_json::json;

    fn people_test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE people (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT,
                email_source TEXT,
                email_status TEXT,
                apollo_person_id TEXT,
                title TEXT,
                management_level TEXT,
                linkedin_url TEXT,
                year_joined INTEGER,
                person_profile TEXT,
                research_status TEXT DEFAULT 'pending',
                researched_at INTEGER,
                user_status TEXT DEFAULT 'new',
                conversation_topics TEXT,
                conversation_generated_at INTEGER,
                created_at INTEGER NOT NULL
            );
            "#,
        )
        .unwrap();
        conn
    }

    #[test]
    fn company_people_upsert_preserves_existing_research_state() {
        let mut conn = people_test_conn();
        conn.execute(
            "INSERT INTO people (
                id, lead_id, first_name, last_name, email, email_source, title, linkedin_url,
                person_profile, research_status, user_status, conversation_topics,
                conversation_generated_at, created_at
             ) VALUES (1, 7, 'Ada', 'Lovelace', 'ada@manual.example', 'manual', 'VP Eng',
                'https://linkedin.com/in/ada', 'researched profile', 'completed', 'qualified',
                'talk about data platform', 1700000000000, 1699999999000)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO people (
                id, lead_id, first_name, last_name, email, email_source, title, linkedin_url,
                person_profile, research_status, user_status, conversation_topics,
                conversation_generated_at, created_at
             ) VALUES (2, 7, 'Bob', 'Stale', 'bob@old.example', 'manual', 'VP Sales',
                'https://linkedin.com/in/bob', 'old profile', 'completed', 'qualified',
                'old conversation', 1700000000000, 1699999999000)",
            [],
        )
        .unwrap();

        let people = vec![json!({
            "firstName": "Ada",
            "lastName": "Lovelace",
            "email": "ada@apollo.example",
            "emailSource": "apollo",
            "emailStatus": "verified",
            "title": "Chief Technology Officer",
            "linkedinUrl": "https://linkedin.com/in/ada",
            "managementLevel": "C-Level"
        })];

        let tx = conn.transaction().unwrap();
        upsert_company_people(&tx, 7, &people).unwrap();
        tx.commit().unwrap();

        let row = conn
            .query_row(
                "SELECT id, email, email_source, title, management_level, person_profile,
                        research_status, user_status, conversation_topics
                 FROM people WHERE lead_id = 7",
                [],
                |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, Option<String>>(5)?,
                        row.get::<_, String>(6)?,
                        row.get::<_, String>(7)?,
                        row.get::<_, Option<String>>(8)?,
                    ))
                },
            )
            .unwrap();

        assert_eq!(row.0, 1);
        assert_eq!(row.1.as_deref(), Some("ada@manual.example"));
        assert_eq!(row.2.as_deref(), Some("manual"));
        assert_eq!(row.3.as_deref(), Some("Chief Technology Officer"));
        assert_eq!(row.4.as_deref(), Some("C-Level"));
        assert_eq!(row.5.as_deref(), Some("researched profile"));
        assert_eq!(row.6, "completed");
        assert_eq!(row.7, "qualified");
        assert_eq!(row.8.as_deref(), Some("talk about data platform"));

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM people WHERE lead_id = 7", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn failed_research_cleanup_removes_stale_artifact_directory() {
        let dir = std::env::temp_dir().join(format!("augur-stale-output-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let profile = dir.join("company_profile.md");
        let people = dir.join("people.json");
        let enrichment = dir.join("enrichment.json");
        std::fs::write(&profile, "stale profile").unwrap();
        std::fs::write(&people, "[]").unwrap();
        std::fs::write(&enrichment, "{}").unwrap();

        let metadata = JobMetadata {
            job_type: JobType::CompanyResearch,
            entity_id: 7,
            research_depth: Some("deep".to_string()),
            primary_output_path: profile,
            secondary_output_path: Some(people),
            enrichment_output_path: Some(enrichment),
        };

        cleanup_output_files(&metadata).unwrap();
        assert!(!dir.exists());
    }

    #[test]
    fn company_research_requires_valid_people_json() {
        let dir =
            std::env::temp_dir().join(format!("augur-required-people-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();
        let profile = dir.join("company_profile.md");
        let people = dir.join("people.json");
        let enrichment = dir.join("enrichment.json");
        std::fs::write(&profile, "fresh profile").unwrap();

        let metadata = JobMetadata {
            job_type: JobType::CompanyResearch,
            entity_id: 7,
            research_depth: Some("deep".to_string()),
            primary_output_path: profile.clone(),
            secondary_output_path: Some(people.clone()),
            enrichment_output_path: Some(enrichment),
        };

        let missing = verify_output_files_for_metadata(&metadata);
        assert!(matches!(
            missing,
            Err(CompletionError::FileNotFound(path)) if path == people
        ));

        std::fs::write(&people, "{not-json").unwrap();
        let outputs = verify_output_files_for_metadata(&metadata).unwrap();
        assert!(parse_company_people_json(outputs.secondary_content.as_ref().unwrap()).is_err());

        let _ = std::fs::remove_dir_all(&dir);
    }
}
