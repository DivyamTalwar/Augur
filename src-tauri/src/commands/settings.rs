use crate::db::{self, DbState, Settings};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_settings(state: State<'_, DbState>) -> Result<Settings, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_settings(state: State<'_, DbState>, use_chrome: bool) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_settings(&conn, use_chrome).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_orchestration_settings(
    state: State<'_, DbState>,
    orchestration_enabled: bool,
    default_research_depth: String,
    apollo_enabled: bool,
    apollo_max_contacts: i64,
    deep_job_concurrency: i64,
    daily_budget_usd_cents: Option<i64>,
) -> Result<(), String> {
    if !matches!(
        default_research_depth.as_str(),
        "light" | "standard" | "deep"
    ) {
        return Err("default_research_depth must be light, standard, or deep".to_string());
    }
    if !(1..=25).contains(&apollo_max_contacts) {
        return Err("apollo_max_contacts must be between 1 and 25".to_string());
    }
    if !(1..=3).contains(&deep_job_concurrency) {
        return Err("deep_job_concurrency must be between 1 and 3".to_string());
    }
    if daily_budget_usd_cents.is_some_and(|value| value < 0) {
        return Err("daily_budget_usd_cents must be non-negative".to_string());
    }

    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    db::update_orchestration_settings(
        &conn,
        orchestration_enabled,
        &default_research_depth,
        apollo_enabled,
        apollo_max_contacts,
        deep_job_concurrency,
        daily_budget_usd_cents,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_apollo_key_status() -> crate::apollo::ApolloKeyStatus {
    crate::apollo::get_key_status()
}

#[tauri::command]
pub fn set_apollo_api_key(api_key: String) -> Result<(), String> {
    crate::apollo::set_api_key(&api_key)
}

#[tauri::command]
pub fn clear_apollo_api_key() -> Result<(), String> {
    crate::apollo::clear_api_key()
}

#[tauri::command]
pub async fn enrich_person_apollo(
    app: AppHandle,
    state: State<'_, DbState>,
    person_id: i64,
) -> Result<crate::apollo::ApolloPersonEnrichment, String> {
    let db_conn = state.conn.clone();
    crate::apollo::enrich_person_by_id(db_conn, app, person_id).await
}
