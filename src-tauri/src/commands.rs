use std::fs;
use tauri::AppHandle;

use crate::api::{
    config_path, credentials, get_auth_client, get_cached_password, saved_connection,
    save_connection, set_cached_password, snapshot, start_background_monitor,
    stop_background_monitor,
};
use crate::db::{fetch_sqlite_info, query_habitant_history, query_player_sessions};
use crate::models::{
    error, ConnectRequest, ConnectionConfig, HabitantHistoryRecord, HabitantSessionRecord,
    Snapshot, SqliteInfo,
};

#[tauri::command]
pub fn get_saved_connection(app: AppHandle) -> Result<Option<ConnectionConfig>, String> {
    saved_connection(&app)
}

#[tauri::command]
pub async fn connect(app: AppHandle, request: ConnectRequest) -> Result<Snapshot, String> {
    let config = ConnectionConfig {
        endpoint: crate::api::normalize_endpoint(&request.endpoint)?,
        username: request.username.trim().to_string(),
    };
    if config.username.is_empty() || request.password.is_empty() {
        return Err(error("bad_request", "Username and password are required."));
    }
    let result = snapshot(&config, &request.password).await?;
    credentials()?
        .set_password(&request.password)
        .map_err(|_| {
            error(
                "unknown",
                "Unable to save credentials in Windows Credential Manager.",
            )
        })?;
    save_connection(&app, &config)?;
    set_cached_password(&app, Some(request.password));
    start_background_monitor(&app, 3);
    Ok(result)
}

#[tauri::command]
pub async fn refresh_monitor(app: AppHandle) -> Result<Snapshot, String> {
    let config = saved_connection(&app)?
        .ok_or_else(|| error("bad_request", "Connect to a server first."))?;
    let password = get_cached_password(&app)?;
    snapshot(&config, &password).await
}

#[tauri::command]
pub fn forget_connection(app: AppHandle) -> Result<(), String> {
    stop_background_monitor(&app);
    set_cached_password(&app, None);
    if let Ok(entry) = credentials() {
        let _ = entry.delete_credential();
    }
    let path = config_path(&app)?;
    if path.exists() {
        let _ = fs::remove_file(path);
    }
    Ok(())
}

#[tauri::command]
pub async fn announce_message(app: AppHandle, message: String) -> Result<(), String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/announce", config.endpoint))
        .json(&serde_json::json!({ "message": message }))
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to send announcement: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
pub async fn save_world(app: AppHandle) -> Result<(), String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/save", config.endpoint))
        .header(reqwest::header::CONTENT_LENGTH, "0")
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to save world state: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn shutdown_server(
    app: AppHandle,
    wait_time: Option<u64>,
    waitTime: Option<u64>,
    message: Option<String>,
) -> Result<(), String> {
    let wt = wait_time.or(waitTime).unwrap_or(60);
    let msg = message.unwrap_or_else(|| "Server is shutting down.".to_string());
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/shutdown", config.endpoint))
        .json(&serde_json::json!({ "waittime": wt, "message": msg }))
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to initiate server shutdown: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_server(app: AppHandle) -> Result<(), String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/stop", config.endpoint))
        .header(reqwest::header::CONTENT_LENGTH, "0")
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to issue emergency stop: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn kick_player(
    app: AppHandle,
    user_id: Option<String>,
    userId: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let uid = user_id.or(userId).ok_or_else(|| error("bad_request", "userId is required"))?;
    let msg = message.unwrap_or_default();
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/kick", config.endpoint))
        .json(&serde_json::json!({ "userid": uid, "message": msg }))
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to kick player: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn ban_player(
    app: AppHandle,
    user_id: Option<String>,
    userId: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let uid = user_id.or(userId).ok_or_else(|| error("bad_request", "userId is required"))?;
    let msg = message.unwrap_or_default();
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/ban", config.endpoint))
        .json(&serde_json::json!({ "userid": uid, "message": msg }))
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to ban player: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
#[allow(non_snake_case)]
pub async fn unban_player(
    app: AppHandle,
    user_id: Option<String>,
    userId: Option<String>,
) -> Result<(), String> {
    let uid = user_id.or(userId).ok_or_else(|| error("bad_request", "userId is required"))?;
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(format!("{}/unban", config.endpoint))
        .json(&serde_json::json!({ "userid": uid }))
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if !res.status().is_success() {
        return Err(error("server_error", &format!("Failed to unban player: {}", res.status())));
    }
    Ok(())
}

#[tauri::command]
pub async fn fetch_ban_list(app: AppHandle) -> Result<serde_json::Value, String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .get(format!("{}/banlist", config.endpoint))
        .send()
        .await
        .map_err(|e| error("network", &e.to_string()))?;
    if res.status().is_success() {
        let val: serde_json::Value = res.json().await.unwrap_or_else(|_| serde_json::json!([]));
        Ok(val)
    } else {
        Ok(serde_json::json!([]))
    }
}

#[tauri::command]
pub fn start_monitoring(app: AppHandle, interval_secs: Option<u64>) -> Result<(), String> {
    start_background_monitor(&app, interval_secs.unwrap_or(3));
    Ok(())
}

#[tauri::command]
pub fn stop_monitoring(app: AppHandle) -> Result<(), String> {
    stop_background_monitor(&app);
    Ok(())
}

#[tauri::command]
pub fn get_sqlite_info(app: AppHandle) -> Result<SqliteInfo, String> {
    fetch_sqlite_info(&app)
}

#[tauri::command]
pub fn fetch_habitant_history(app: AppHandle) -> Result<Vec<HabitantHistoryRecord>, String> {
    query_habitant_history(&app)
}

#[tauri::command]
pub fn fetch_player_sessions(
    app: AppHandle,
    player_id: String,
) -> Result<Vec<HabitantSessionRecord>, String> {
    query_player_sessions(&app, player_id)
}
