/// Default prompts embedded at compile time from markdown files
pub mod defaults {
    pub const COMPANY: &str = include_str!("defaults/company.md");
    pub const PERSON: &str = include_str!("defaults/person.md");
    pub const CONVERSATION_TOPICS: &str = include_str!("defaults/conversation_topics.md");
}

pub mod agents {
    pub const PAIN_DIAGNOSTICIAN: &str = include_str!("agents/pain-diagnostician.md");
    pub const BUSINESS_MODEL_STRATEGIST: &str = include_str!("agents/business-model-strategist.md");
    pub const TRIGGER_SIGNAL_ANALYST: &str = include_str!("agents/trigger-signal-analyst.md");
    pub const TECH_STACK_ANALYST: &str = include_str!("agents/tech-stack-analyst.md");
    pub const COMPETITIVE_POSITION_ANALYST: &str =
        include_str!("agents/competitive-position-analyst.md");
    pub const PEOPLE_FINDER: &str = include_str!("agents/people-finder.md");
    pub const BUYER_PROFILE_SYNTHESIZER: &str = include_str!("agents/buyer-profile-synthesizer.md");
    pub const VERIFIER: &str = include_str!("agents/verifier.md");
    pub const SYNTHESIZER: &str = include_str!("agents/synthesizer.md");
}

/// Get the default prompt content for a given prompt type.
/// Returns None for types that have no default (like company_overview which must be user-provided).
pub fn get_default_prompt(prompt_type: &str) -> Option<&'static str> {
    match prompt_type {
        "company" => Some(defaults::COMPANY),
        "person" => Some(defaults::PERSON),
        "conversation_topics" => Some(defaults::CONVERSATION_TOPICS),
        // company_overview has no default - user must provide it
        _ => None,
    }
}
