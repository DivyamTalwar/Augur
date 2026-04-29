use std::sync::{Arc, Mutex};
use std::time::Duration;

use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, CONTENT_TYPE, RETRY_AFTER};
use rusqlite::{params, Connection, TransactionBehavior};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

const APOLLO_BASE_URL: &str = "https://api.apollo.io/api/v1";
const CACHE_TTL_MS: i64 = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_SECS: u64 = 20;
const MAX_ATTEMPTS: usize = 3;
const APOLLO_MATCH_COST_CENTS: i64 = 1;
const KEYRING_SERVICE: &str = "augur-os";
const KEYRING_USER: &str = "apollo_api_key";
const USAGE_PENDING: &str = "pending";
const USAGE_COMPLETED: &str = "completed";
const USAGE_FAILED: &str = "failed";
const USAGE_ABANDONED: &str = "abandoned";
const USAGE_BUDGET_EXCEEDED: &str = "budget_exceeded";
const PENDING_RECOVERY_AGE_MS: i64 = 60 * 60 * 1000;

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApolloKeyStatus {
    pub configured: bool,
    pub source: String,
}

pub fn get_key_status() -> ApolloKeyStatus {
    if std::env::var("APOLLO_API_KEY")
        .ok()
        .filter(|key| !key.trim().is_empty())
        .is_some()
    {
        return ApolloKeyStatus {
            configured: true,
            source: "env".to_string(),
        };
    }

    if load_key_from_keyring().is_some() {
        return ApolloKeyStatus {
            configured: true,
            source: "keychain".to_string(),
        };
    }

    ApolloKeyStatus {
        configured: false,
        source: "none".to_string(),
    }
}

pub fn set_api_key(api_key: &str) -> Result<(), String> {
    if api_key.trim().is_empty() {
        return Err("Apollo API key cannot be empty".to_string());
    }
    keyring_entry()?
        .set_password(api_key.trim())
        .map_err(|e| e.to_string())
}

pub fn clear_api_key() -> Result<(), String> {
    match keyring_entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn recover_abandoned_usage(conn: &Connection, now: i64) -> Result<usize, String> {
    let cutoff = now - PENDING_RECOVERY_AGE_MS;
    conn.execute(
        "UPDATE apollo_usage
         SET status = ?1,
             error_message = 'Recovered abandoned Apollo reservation'
         WHERE status = ?2
           AND created_at < ?3
           AND (
             job_id IS NULL
             OR NOT EXISTS (
               SELECT 1 FROM jobs
               WHERE jobs.id = apollo_usage.job_id
                 AND jobs.status IN ('queued', 'running')
             )
           )",
        params![USAGE_ABANDONED, USAGE_PENDING, cutoff],
    )
    .map_err(|e| e.to_string())
}

pub async fn enrich_people_json(
    db_conn: Arc<Mutex<Connection>>,
    job_id: &str,
    lead_id: i64,
    people: Vec<Value>,
) -> Vec<Value> {
    let setup = {
        let conn = match db_conn.lock() {
            Ok(conn) => conn,
            Err(_) => return people,
        };

        let settings = match crate::db::get_settings(&conn) {
            Ok(settings) => settings,
            Err(e) => {
                eprintln!("[apollo] Failed to read settings: {}", e);
                return people;
            }
        };

        if !settings.apollo_enabled {
            return people;
        }

        let lead = match crate::db::get_lead(&conn, lead_id) {
            Ok(Some(lead)) => lead,
            Ok(None) => {
                log_usage(
                    &conn,
                    job_id,
                    lead_id,
                    0,
                    0,
                    "skipped",
                    Some("Lead not found"),
                );
                return people;
            }
            Err(e) => {
                eprintln!("[apollo] Failed to read lead: {}", e);
                return people;
            }
        };

        (settings, lead)
    };

    let (settings, lead) = setup;
    let api_key = match load_api_key() {
        Some(key) => key,
        None => {
            if let Ok(conn) = db_conn.lock() {
                log_usage(
                    &conn,
                    job_id,
                    lead_id,
                    0,
                    0,
                    "skipped",
                    Some("Apollo API key is not configured"),
                );
            }
            return people;
        }
    };

    let domain = lead.website.as_deref().and_then(normalize_domain);
    let max_contacts = settings.apollo_max_contacts.clamp(1, 25) as usize;

    let mut enriched = people;
    let mut requests = Vec::new();
    let now = chrono::Utc::now().timestamp_millis();

    for (index, person) in enriched.iter_mut().take(max_contacts).enumerate() {
        let cache_key = cache_key_for_person(person, domain.as_deref(), &lead.company_name);
        if let Some(cached) = read_cache(&db_conn, &cache_key, now) {
            merge_apollo_person(person, &cached);
            continue;
        }

        requests.push(ApolloRequest {
            index,
            cache_key,
            body: detail_for_person(person, domain.as_deref(), &lead.company_name),
        });
    }

    if requests.is_empty() {
        return enriched;
    }

    let requested_count = requests.len() as i64;
    let usage_id = match settings.daily_budget_usd_cents {
        Some(limit_cents) => {
            match reserve_budget(&db_conn, job_id, lead_id, requested_count, limit_cents, now) {
                Ok(BudgetReservation::Reserved(id)) => Some(id),
                Ok(BudgetReservation::Denied) => return enriched,
                Err(e) => {
                    eprintln!("[apollo] Failed to reserve budget: {}", e);
                    return enriched;
                }
            }
        }
        None => None,
    };

    match bulk_match(
        &api_key,
        requests
            .iter()
            .map(|request| request.body.clone())
            .collect(),
    )
    .await
    {
        Ok(response) => {
            let mut apollo_people = extract_apollo_people(&response);
            let mut enriched_count = 0;

            for request in &requests {
                if let Some(person) = enriched.get_mut(request.index) {
                    let Some(match_index) = find_best_match_index(person, &apollo_people) else {
                        continue;
                    };
                    let apollo_person = apollo_people.remove(match_index);
                    if merge_apollo_person(person, &apollo_person) {
                        enriched_count += 1;
                    }
                    write_cache(&db_conn, &request.cache_key, &apollo_person, now);
                }
            }

            finish_or_log_usage(
                &db_conn,
                usage_id,
                job_id,
                lead_id,
                requested_count,
                enriched_count,
                USAGE_COMPLETED,
                None,
            );
        }
        Err(e) => {
            eprintln!("[apollo] Bulk enrichment failed: {}", e);
            finish_or_log_usage(
                &db_conn,
                usage_id,
                job_id,
                lead_id,
                requested_count,
                0,
                USAGE_FAILED,
                Some(&e),
            );
        }
    }

    enriched
}

fn load_api_key() -> Option<String> {
    std::env::var("APOLLO_API_KEY")
        .ok()
        .filter(|key| !key.trim().is_empty())
        .or_else(load_key_from_keyring)
}

fn load_key_from_keyring() -> Option<String> {
    keyring_entry().ok()?.get_password().ok()
}

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())
}

struct ApolloRequest {
    index: usize,
    cache_key: String,
    body: Value,
}

async fn bulk_match(api_key: &str, details: Vec<Value>) -> Result<Value, String> {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
    headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
    headers.insert(
        "x-api-key",
        HeaderValue::from_str(api_key).map_err(|e| e.to_string())?,
    );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .map_err(|e| e.to_string())?;
    let url = format!("{}/people/bulk_match", APOLLO_BASE_URL);

    let mut last_error = None;
    for attempt in 1..=MAX_ATTEMPTS {
        let response = client
            .post(&url)
            .headers(headers.clone())
            .query(&[
                ("reveal_personal_emails", "false"),
                ("reveal_phone_number", "false"),
            ])
            .json(&json!({ "details": details }))
            .send()
            .await;

        let response = match response {
            Ok(response) => response,
            Err(e) => {
                last_error = Some(e.to_string());
                if attempt < MAX_ATTEMPTS {
                    tokio::time::sleep(retry_delay(attempt)).await;
                    continue;
                }
                break;
            }
        };

        let status = response.status();
        let retry_after = retry_after_delay(response.headers());
        let body = response.text().await.map_err(|e| e.to_string())?;
        if status.is_success() {
            return serde_json::from_str(&body).map_err(|e| e.to_string());
        }

        last_error = Some(safe_provider_error(status.as_u16(), &body));
        if !should_retry_status(status.as_u16()) || attempt == MAX_ATTEMPTS {
            break;
        }
        tokio::time::sleep(retry_after.unwrap_or_else(|| retry_delay(attempt))).await;
    }

    Err(last_error.unwrap_or_else(|| "Apollo request failed".to_string()))
}

fn should_retry_status(status: u16) -> bool {
    status == 429 || (500..=599).contains(&status)
}

fn retry_delay(attempt: usize) -> Duration {
    Duration::from_millis(300 * attempt as u64)
}

fn retry_after_delay(headers: &HeaderMap) -> Option<Duration> {
    headers
        .get(RETRY_AFTER)?
        .to_str()
        .ok()?
        .trim()
        .parse::<u64>()
        .ok()
        .map(Duration::from_secs)
}

fn safe_provider_error(status: u16, body: &str) -> String {
    let body_hash = Sha256::digest(body.as_bytes());
    format!(
        "Apollo returned HTTP {} (body_sha256={:x})",
        status, body_hash
    )
}

fn detail_for_person(person: &Value, domain: Option<&str>, company_name: &str) -> Value {
    let first_name = person.get("firstName").and_then(Value::as_str);
    let last_name = person.get("lastName").and_then(Value::as_str);
    let name = person
        .get("name")
        .and_then(Value::as_str)
        .map(ToString::to_string)
        .or_else(|| match (first_name, last_name) {
            (Some(first), Some(last)) => Some(format!("{} {}", first, last)),
            _ => None,
        });

    json!({
        "first_name": first_name,
        "last_name": last_name,
        "name": name,
        "organization_name": company_name,
        "domain": domain,
        "linkedin_url": person.get("linkedinUrl").and_then(Value::as_str),
    })
}

fn extract_apollo_people(response: &Value) -> Vec<Value> {
    if let Some(items) = response.get("people").and_then(Value::as_array) {
        return items.clone();
    }
    if let Some(items) = response.get("persons").and_then(Value::as_array) {
        return items.clone();
    }
    if let Some(items) = response.get("matches").and_then(Value::as_array) {
        return items
            .iter()
            .filter_map(|item| item.get("person").or_else(|| item.get("contact")).cloned())
            .collect();
    }
    if let Some(items) = response.get("details").and_then(Value::as_array) {
        return items
            .iter()
            .filter_map(|item| item.get("person").or_else(|| item.get("contact")).cloned())
            .collect();
    }
    if let Some(person) = response.get("person") {
        return vec![person.clone()];
    }
    Vec::new()
}

fn merge_apollo_person(person: &mut Value, apollo_person: &Value) -> bool {
    let Some(person_obj) = person.as_object_mut() else {
        return false;
    };

    let email = apollo_person
        .get("email")
        .and_then(Value::as_str)
        .filter(|email| !email.trim().is_empty());
    let id = apollo_person
        .get("id")
        .or_else(|| apollo_person.get("person_id"))
        .and_then(Value::as_str);
    let email_status = apollo_person
        .get("email_status")
        .or_else(|| apollo_person.get("emailStatus"))
        .and_then(Value::as_str);

    let mut changed = false;

    let mut apollo_email_applies = false;
    if let Some(email) = email {
        let existing_email = person_obj
            .get("email")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_string();
        if existing_email.is_empty() {
            person_obj.insert("email".to_string(), Value::String(email.to_string()));
            changed = true;
            apollo_email_applies = true;
        } else if existing_email.eq_ignore_ascii_case(email.trim()) {
            apollo_email_applies = true;
        }

        if apollo_email_applies {
            person_obj.insert(
                "emailSource".to_string(),
                Value::String("apollo".to_string()),
            );
        }
    }

    if apollo_email_applies {
        if let Some(email_status) = email_status {
            person_obj.insert(
                "emailStatus".to_string(),
                Value::String(email_status.to_string()),
            );
        }
    }
    if let Some(id) = id {
        person_obj.insert("apolloPersonId".to_string(), Value::String(id.to_string()));
    }
    copy_if_missing(person_obj, apollo_person, "title", "title");
    copy_if_missing(person_obj, apollo_person, "linkedinUrl", "linkedin_url");

    changed || apollo_email_applies
}

fn find_best_match_index(person: &Value, candidates: &[Value]) -> Option<usize> {
    let linkedin = normalized_field(person, "linkedinUrl");
    if !linkedin.is_empty() {
        if let Some((index, _)) = candidates.iter().enumerate().find(|(_, candidate)| {
            normalized_field(candidate, "linkedin_url") == linkedin
                || normalized_field(candidate, "linkedinUrl") == linkedin
        }) {
            return Some(index);
        }
    }

    let first = normalized_field(person, "firstName");
    let last = normalized_field(person, "lastName");
    if first.is_empty() || last.is_empty() {
        return None;
    }

    let matches: Vec<usize> = candidates
        .iter()
        .enumerate()
        .filter_map(|(index, candidate)| {
            let candidate_first = normalized_field(candidate, "first_name")
                .if_empty_then(|| normalized_field(candidate, "firstName"));
            let candidate_last = normalized_field(candidate, "last_name")
                .if_empty_then(|| normalized_field(candidate, "lastName"));
            (candidate_first == first && candidate_last == last).then_some(index)
        })
        .collect();

    if matches.len() == 1 {
        Some(matches[0])
    } else {
        None
    }
}

trait EmptyStringExt {
    fn if_empty_then<F>(self, fallback: F) -> String
    where
        F: FnOnce() -> String;
}

impl EmptyStringExt for String {
    fn if_empty_then<F>(self, fallback: F) -> String
    where
        F: FnOnce() -> String,
    {
        if self.is_empty() {
            fallback()
        } else {
            self
        }
    }
}

fn normalized_field(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .to_lowercase()
}

fn copy_if_missing(
    person_obj: &mut serde_json::Map<String, Value>,
    source: &Value,
    dest_key: &str,
    source_key: &str,
) {
    let missing = person_obj
        .get(dest_key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim()
        .is_empty();
    if missing {
        if let Some(value) = source.get(source_key).and_then(Value::as_str) {
            if !value.trim().is_empty() {
                person_obj.insert(dest_key.to_string(), Value::String(value.to_string()));
            }
        }
    }
}

fn cache_key_for_person(person: &Value, domain: Option<&str>, company_name: &str) -> String {
    let raw = format!(
        "v2|{}|{}|{}|{}|{}",
        person
            .get("firstName")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_lowercase(),
        person
            .get("lastName")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_lowercase(),
        person
            .get("linkedinUrl")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_lowercase(),
        domain.unwrap_or_default().to_lowercase(),
        company_name.to_lowercase(),
    );
    let digest = Sha256::digest(raw.as_bytes());
    format!("{:x}", digest)
}

fn read_cache(db_conn: &Arc<Mutex<Connection>>, cache_key: &str, now: i64) -> Option<Value> {
    let conn = db_conn.lock().ok()?;
    let response_json: String = conn
        .query_row(
            "SELECT response_json FROM apollo_cache WHERE cache_key = ?1 AND expires_at > ?2",
            params![cache_key, now],
            |row| row.get(0),
        )
        .ok()?;
    serde_json::from_str(&response_json).ok()
}

fn write_cache(db_conn: &Arc<Mutex<Connection>>, cache_key: &str, apollo_person: &Value, now: i64) {
    let Ok(conn) = db_conn.lock() else {
        return;
    };
    let email = apollo_person.get("email").and_then(Value::as_str);
    let email_status = apollo_person
        .get("email_status")
        .or_else(|| apollo_person.get("emailStatus"))
        .and_then(Value::as_str);
    let apollo_person_id = apollo_person
        .get("id")
        .or_else(|| apollo_person.get("person_id"))
        .and_then(Value::as_str);
    let response_json = apollo_person.to_string();
    let expires_at = now + CACHE_TTL_MS;

    if let Err(e) = conn.execute(
        "INSERT INTO apollo_cache (
            cache_key, response_json, email, email_status, apollo_person_id,
            expires_at, created_at, updated_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
         ON CONFLICT(cache_key) DO UPDATE SET
            response_json = excluded.response_json,
            email = excluded.email,
            email_status = excluded.email_status,
            apollo_person_id = excluded.apollo_person_id,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at",
        params![
            cache_key,
            response_json,
            email,
            email_status,
            apollo_person_id,
            expires_at,
            now
        ],
    ) {
        eprintln!("[apollo] Failed to write cache: {}", e);
    }
}

fn log_usage(
    conn: &Connection,
    job_id: &str,
    lead_id: i64,
    requested_count: i64,
    enriched_count: i64,
    status: &str,
    error_message: Option<&str>,
) {
    let now = chrono::Utc::now().timestamp_millis();
    if let Err(e) = conn.execute(
        "INSERT INTO apollo_usage (
            job_id, lead_id, endpoint, requested_count, enriched_count,
            status, error_message, created_at
         )
         VALUES (?1, ?2, 'people/bulk_match', ?3, ?4, ?5, ?6, ?7)",
        params![
            job_id,
            lead_id,
            requested_count,
            enriched_count,
            status,
            error_message,
            now
        ],
    ) {
        eprintln!("[apollo] Failed to write usage log: {}", e);
    }
}

enum BudgetReservation {
    Reserved(i64),
    Denied,
}

fn reserve_budget(
    db_conn: &Arc<Mutex<Connection>>,
    job_id: &str,
    lead_id: i64,
    requested_count: i64,
    daily_budget_usd_cents: i64,
    now: i64,
) -> Result<BudgetReservation, String> {
    let mut conn = db_conn.lock().map_err(|e| e.to_string())?;
    reserve_budget_on_conn(
        &mut conn,
        job_id,
        lead_id,
        requested_count,
        daily_budget_usd_cents,
        now,
    )
}

fn reserve_budget_on_conn(
    conn: &mut Connection,
    job_id: &str,
    lead_id: i64,
    requested_count: i64,
    daily_budget_usd_cents: i64,
    now: i64,
) -> Result<BudgetReservation, String> {
    let tx = conn
        .transaction_with_behavior(TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;

    if !budget_allows(&tx, daily_budget_usd_cents, requested_count, now) {
        tx.execute(
            "INSERT INTO apollo_usage (
                job_id, lead_id, endpoint, requested_count, enriched_count,
                status, error_message, created_at
             )
             VALUES (?1, ?2, 'people/bulk_match', ?3, 0, ?4, ?5, ?6)",
            params![
                job_id,
                lead_id,
                requested_count,
                USAGE_BUDGET_EXCEEDED,
                "Apollo daily budget cap reached",
                now
            ],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        return Ok(BudgetReservation::Denied);
    }

    tx.execute(
        "INSERT INTO apollo_usage (
            job_id, lead_id, endpoint, requested_count, enriched_count,
            status, error_message, created_at
         )
         VALUES (?1, ?2, 'people/bulk_match', ?3, 0, ?4, NULL, ?5)",
        params![job_id, lead_id, requested_count, USAGE_PENDING, now],
    )
    .map_err(|e| e.to_string())?;
    let usage_id = tx.last_insert_rowid();
    tx.commit().map_err(|e| e.to_string())?;

    Ok(BudgetReservation::Reserved(usage_id))
}

#[allow(clippy::too_many_arguments)]
fn finish_or_log_usage(
    db_conn: &Arc<Mutex<Connection>>,
    usage_id: Option<i64>,
    job_id: &str,
    lead_id: i64,
    requested_count: i64,
    enriched_count: i64,
    status: &str,
    error_message: Option<&str>,
) {
    let Ok(conn) = db_conn.lock() else {
        return;
    };

    match usage_id {
        Some(id) => finish_reserved_usage(&conn, id, enriched_count, status, error_message),
        None => log_usage(
            &conn,
            job_id,
            lead_id,
            requested_count,
            enriched_count,
            status,
            error_message,
        ),
    }
}

fn finish_reserved_usage(
    conn: &Connection,
    usage_id: i64,
    enriched_count: i64,
    status: &str,
    error_message: Option<&str>,
) {
    if let Err(e) = conn.execute(
        "UPDATE apollo_usage
         SET enriched_count = ?1,
             status = ?2,
             error_message = ?3
         WHERE id = ?4",
        params![enriched_count, status, error_message, usage_id],
    ) {
        eprintln!("[apollo] Failed to finish reserved usage row: {}", e);
    }
}

fn budget_allows(
    conn: &Connection,
    daily_budget_usd_cents: i64,
    requested_count: i64,
    now: i64,
) -> bool {
    if daily_budget_usd_cents <= 0 {
        return false;
    }

    let day_start = now - (24 * 60 * 60 * 1000);
    let used_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(requested_count), 0) * ?2
             FROM apollo_usage
             WHERE created_at >= ?1 AND status IN ('pending', 'completed', 'failed')",
            params![day_start, APOLLO_MATCH_COST_CENTS],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Apollo plan costs vary by account; use one cent per requested contact as a conservative local cap unit.
    used_cents + requested_count * APOLLO_MATCH_COST_CENTS <= daily_budget_usd_cents
}

fn normalize_domain(website: &str) -> Option<String> {
    let trimmed = website.trim();
    if trimmed.is_empty() {
        return None;
    }
    let without_scheme = trimmed
        .strip_prefix("https://")
        .or_else(|| trimmed.strip_prefix("http://"))
        .unwrap_or(trimmed);
    let host = without_scheme.split('/').next().unwrap_or(without_scheme);
    let host = host.strip_prefix("www.").unwrap_or(host);
    if host.is_empty() {
        None
    } else {
        Some(host.to_lowercase())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_domain_strips_scheme_path_and_www() {
        assert_eq!(
            normalize_domain("https://www.example.com/pricing?x=1"),
            Some("example.com".to_string())
        );
        assert_eq!(
            normalize_domain("example.com"),
            Some("example.com".to_string())
        );
        assert_eq!(normalize_domain("  "), None);
    }

    #[test]
    fn merge_apollo_person_fills_missing_contact_fields() {
        let mut person = json!({
            "firstName": "Ada",
            "lastName": "Lovelace",
            "title": "",
            "linkedinUrl": ""
        });
        let apollo = json!({
            "id": "abc123",
            "email": "ada@example.com",
            "email_status": "verified",
            "title": "VP Engineering",
            "linkedin_url": "https://linkedin.com/in/ada"
        });

        assert!(merge_apollo_person(&mut person, &apollo));
        assert_eq!(person["email"], "ada@example.com");
        assert_eq!(person["emailSource"], "apollo");
        assert_eq!(person["emailStatus"], "verified");
        assert_eq!(person["apolloPersonId"], "abc123");
        assert_eq!(person["title"], "VP Engineering");
        assert_eq!(person["linkedinUrl"], "https://linkedin.com/in/ada");
    }

    #[test]
    fn merge_apollo_person_preserves_existing_email_provenance() {
        let mut person = json!({
            "firstName": "Ada",
            "lastName": "Lovelace",
            "email": "ada@user-entered.example",
            "emailSource": "manual"
        });
        let apollo = json!({
            "id": "abc123",
            "email": "ada@apollo.example",
            "email_status": "verified"
        });

        assert!(!merge_apollo_person(&mut person, &apollo));
        assert_eq!(person["email"], "ada@user-entered.example");
        assert_eq!(person["emailSource"], "manual");
        assert!(person.get("emailStatus").is_none());
        assert_eq!(person["apolloPersonId"], "abc123");
    }

    #[test]
    fn best_match_uses_name_instead_of_response_order() {
        let person = json!({
            "firstName": "Ada",
            "lastName": "Lovelace"
        });
        let candidates = vec![
            json!({"first_name": "Grace", "last_name": "Hopper", "email": "grace@example.com"}),
            json!({"first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com"}),
        ];

        assert_eq!(find_best_match_index(&person, &candidates), Some(1));
    }

    #[test]
    fn best_match_skips_ambiguous_name_without_linkedin() {
        let person = json!({
            "firstName": "John",
            "lastName": "Smith"
        });
        let candidates = vec![
            json!({"first_name": "John", "last_name": "Smith", "email": "john.one@example.com"}),
            json!({"first_name": "John", "last_name": "Smith", "email": "john.two@example.com"}),
        ];

        assert_eq!(find_best_match_index(&person, &candidates), None);
    }

    #[test]
    fn provider_error_is_sanitized_to_status_and_hash() {
        let error = safe_provider_error(500, r#"{"debug":"secret account payload"}"#);

        assert!(error.contains("HTTP 500"));
        assert!(error.contains("body_sha256="));
        assert!(!error.contains("secret account payload"));
    }

    #[test]
    fn retry_policy_retries_rate_limits_and_server_errors_only() {
        assert!(should_retry_status(429));
        assert!(should_retry_status(500));
        assert!(!should_retry_status(401));
        assert!(!should_retry_status(404));
    }

    #[test]
    fn retry_after_delay_reads_seconds_header() {
        let mut headers = HeaderMap::new();
        headers.insert(RETRY_AFTER, HeaderValue::from_static("2"));

        assert_eq!(retry_after_delay(&headers), Some(Duration::from_secs(2)));
    }

    #[test]
    fn budget_allows_uses_daily_cap_window() {
        let conn = test_usage_conn();

        let now = 1_700_000_000_000;
        conn.execute(
            "INSERT INTO apollo_usage (
                job_id, lead_id, endpoint, requested_count, enriched_count,
                status, error_message, created_at
             ) VALUES ('job-1', 1, 'people/bulk_match', 9, 9, 'completed', NULL, ?1)",
            params![now - 1_000],
        )
        .unwrap();

        assert!(budget_allows(&conn, 10, 1, now));
        assert!(!budget_allows(&conn, 10, 2, now));
    }

    #[test]
    fn budget_reservation_blocks_concurrent_overspend() {
        let mut conn = test_usage_conn();
        let now = 1_700_000_000_000;

        match reserve_budget_on_conn(&mut conn, "job-1", 1, 6, 10, now).unwrap() {
            BudgetReservation::Reserved(_) => {}
            BudgetReservation::Denied => panic!("first reservation should fit the cap"),
        }

        match reserve_budget_on_conn(&mut conn, "job-2", 2, 6, 10, now).unwrap() {
            BudgetReservation::Reserved(_) => panic!("second reservation should be denied"),
            BudgetReservation::Denied => {}
        }

        let pending: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM apollo_usage WHERE status = ?1",
                params![USAGE_PENDING],
                |row| row.get(0),
            )
            .unwrap();
        let denied: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM apollo_usage WHERE status = ?1",
                params![USAGE_BUDGET_EXCEEDED],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(pending, 1);
        assert_eq!(denied, 1);
    }

    fn test_usage_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE apollo_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT,
                lead_id INTEGER,
                endpoint TEXT NOT NULL,
                requested_count INTEGER NOT NULL DEFAULT 0,
                enriched_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                error_message TEXT,
                created_at INTEGER NOT NULL
            );
            "#,
        )
        .unwrap();
        conn
    }
}
