use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::db::Settings;
use crate::prompts;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResearchDepth {
    Light,
    Standard,
    Deep,
}

impl ResearchDepth {
    pub fn from_name(value: &str) -> Self {
        match value {
            "standard" => Self::Standard,
            "deep" => Self::Deep,
            _ => Self::Light,
        }
    }

    pub fn from_settings(settings: &Settings) -> Self {
        Self::from_name(&settings.default_research_depth)
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Light => "light",
            Self::Standard => "standard",
            Self::Deep => "deep",
        }
    }

    pub fn concurrency_weight(self, deep_job_concurrency: i64) -> u32 {
        match self {
            Self::Light => 1,
            Self::Standard => 2,
            Self::Deep => match deep_job_concurrency.clamp(1, 3) {
                1 => 9,
                2 => 4,
                _ => 3,
            },
        }
    }

    pub fn timeout_secs(self) -> u64 {
        match self {
            Self::Light => 600,
            Self::Standard => 1_200,
            Self::Deep => 1_800,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PreparedWorkspace {
    pub path: PathBuf,
    pub agent_names: Vec<&'static str>,
}

struct AgentTemplate {
    file_name: &'static str,
    name: &'static str,
    content: &'static str,
}

pub fn should_orchestrate(settings: &Settings, depth: ResearchDepth) -> bool {
    settings.orchestration_enabled && depth != ResearchDepth::Light
}

pub fn prepare_job_workspace(
    app: &AppHandle,
    job_id: &str,
    depth: ResearchDepth,
) -> Result<PreparedWorkspace, String> {
    let workspace = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("jobs")
        .join(job_id);
    let agents_dir = workspace.join(".claude").join("agents");
    fs::create_dir_all(&agents_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(workspace.join("outputs").join("specialists")).map_err(|e| e.to_string())?;

    let templates = templates_for_depth(depth);
    let agent_names = templates
        .iter()
        .map(|template| template.name)
        .collect::<Vec<_>>();

    for template in templates {
        let path = agents_dir.join(template.file_name);
        fs::write(path, template.content).map_err(|e| e.to_string())?;
    }

    fs::write(
        workspace.join("README.md"),
        format!(
            "# Augur OS Research Job\n\nDepth: `{}`\n\nSpecialist outputs must be written to `outputs/specialists/`.\n",
            depth.as_str()
        ),
    )
    .map_err(|e| e.to_string())?;

    Ok(PreparedWorkspace {
        path: workspace,
        agent_names,
    })
}

pub fn cleanup_job_workspace(app: &AppHandle, job_id: &str) {
    let workspace = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("jobs")
        .join(job_id);

    if workspace.exists() {
        if let Err(e) = fs::remove_dir_all(&workspace) {
            eprintln!(
                "[orchestration] Warning: failed to cleanup workspace {:?}: {}",
                workspace, e
            );
        }
    }
}

pub fn orchestration_prompt_block(depth: ResearchDepth) -> Option<String> {
    if depth == ResearchDepth::Light {
        return None;
    }

    let agent_names = templates_for_depth(depth)
        .into_iter()
        .map(|template| template.name)
        .collect::<Vec<_>>();

    let wave_plan = match depth {
        ResearchDepth::Light => unreachable!(),
        ResearchDepth::Standard => {
            "Wave 1 in parallel: pain-diagnostician, business-model-strategist, trigger-signal-analyst, tech-stack-analyst, people-finder.\nWave 2: verifier reviews Wave 1 outputs.\nWave 3: synthesizer writes the final files."
        }
        ResearchDepth::Deep => {
            "Wave 1 in parallel: pain-diagnostician, business-model-strategist, trigger-signal-analyst, tech-stack-analyst, competitive-position-analyst, people-finder.\nWave 2: buyer-profile-synthesizer uses Wave 1 outputs.\nWave 3: verifier reviews all prior outputs.\nWave 4: synthesizer writes the final files."
        }
    };

    Some(format!(
        r#"# Specialist Research Orchestration

Research depth: `{depth}`.

You are the parent orchestrator. Use the project subagents available in `.claude/agents/` for this job:
{agents}

Execution plan:
{wave_plan}

Rules:
- Run independent Wave 1 specialists in parallel.
- Each specialist must write its strict JSON envelope to `outputs/specialists/<agent-name>.json`.
- Each specialist must write a short progress log to `outputs/specialists/<agent-name>.stream.log`.
- Each specialist must return only this compact pointer: `{{"agent":"<name>","status":"completed","path":"outputs/specialists/<name>.json","streamLog":"outputs/specialists/<name>.stream.log"}}`.
- After every wave, read the JSON artifacts from disk before launching the next wave.
- The verifier is authoritative for claim acceptance and rejection.
- The final synthesizer writes only the three requested final output files.
- If a subagent is unavailable, complete the same role in the parent session and still save the JSON envelope.
- Specialist `tools:` frontmatter is a behavior contract, not a security sandbox; the parent Claude process is trusted and may have broader local tool access.
- Do not place API keys or secrets in any prompt, output file, stream message, or profile.
- Do not invent private contact data. Apollo enrichment is performed by the application outside Claude.
"#,
        depth = depth.as_str(),
        agents = agent_names
            .iter()
            .map(|name| format!("- `{}`", name))
            .collect::<Vec<_>>()
            .join("\n"),
        wave_plan = wave_plan,
    ))
}

fn templates_for_depth(depth: ResearchDepth) -> Vec<AgentTemplate> {
    let mut templates = match depth {
        ResearchDepth::Light => Vec::new(),
        ResearchDepth::Standard => vec![
            agent(
                "pain-diagnostician.md",
                "pain-diagnostician",
                prompts::agents::PAIN_DIAGNOSTICIAN,
            ),
            agent(
                "business-model-strategist.md",
                "business-model-strategist",
                prompts::agents::BUSINESS_MODEL_STRATEGIST,
            ),
            agent(
                "trigger-signal-analyst.md",
                "trigger-signal-analyst",
                prompts::agents::TRIGGER_SIGNAL_ANALYST,
            ),
            agent(
                "tech-stack-analyst.md",
                "tech-stack-analyst",
                prompts::agents::TECH_STACK_ANALYST,
            ),
            agent(
                "people-finder.md",
                "people-finder",
                prompts::agents::PEOPLE_FINDER,
            ),
            agent("verifier.md", "verifier", prompts::agents::VERIFIER),
            agent(
                "synthesizer.md",
                "synthesizer",
                prompts::agents::SYNTHESIZER,
            ),
        ],
        ResearchDepth::Deep => vec![
            agent(
                "pain-diagnostician.md",
                "pain-diagnostician",
                prompts::agents::PAIN_DIAGNOSTICIAN,
            ),
            agent(
                "business-model-strategist.md",
                "business-model-strategist",
                prompts::agents::BUSINESS_MODEL_STRATEGIST,
            ),
            agent(
                "trigger-signal-analyst.md",
                "trigger-signal-analyst",
                prompts::agents::TRIGGER_SIGNAL_ANALYST,
            ),
            agent(
                "tech-stack-analyst.md",
                "tech-stack-analyst",
                prompts::agents::TECH_STACK_ANALYST,
            ),
            agent(
                "competitive-position-analyst.md",
                "competitive-position-analyst",
                prompts::agents::COMPETITIVE_POSITION_ANALYST,
            ),
            agent(
                "people-finder.md",
                "people-finder",
                prompts::agents::PEOPLE_FINDER,
            ),
            agent(
                "buyer-profile-synthesizer.md",
                "buyer-profile-synthesizer",
                prompts::agents::BUYER_PROFILE_SYNTHESIZER,
            ),
            agent("verifier.md", "verifier", prompts::agents::VERIFIER),
            agent(
                "synthesizer.md",
                "synthesizer",
                prompts::agents::SYNTHESIZER,
            ),
        ],
    };

    templates.sort_by_key(|template| template.file_name);
    templates
}

fn agent(file_name: &'static str, name: &'static str, content: &'static str) -> AgentTemplate {
    AgentTemplate {
        file_name,
        name,
        content,
    }
}
