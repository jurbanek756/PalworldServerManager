use base64::Engine;
use keyring::Entry;
use reqwest::{
    header::{HeaderMap, HeaderValue, AUTHORIZATION},
    Client, StatusCode,
};
use serde::{Deserialize, Serialize};
use std::{fs, time::Duration};
use tauri::{AppHandle, Emitter, Manager};
use url::Url;

const SERVICE: &str = "Palworld Server Monitor";
const ACCOUNT: &str = "palworld-rest-api";

pub struct AppDbState(pub std::sync::Mutex<rusqlite::Connection>);
#[derive(Default)]
pub struct AppCredentialState(pub std::sync::Mutex<Option<String>>);

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConnectRequest {
    endpoint: String,
    username: String,
    password: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionConfig {
    endpoint: String,
    username: String,
}
#[derive(Serialize, Deserialize, Clone)]
struct ServerInfo {
    #[serde(default)]
    version: String,
    #[serde(default)]
    servername: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    worldguid: String,
}
#[derive(Serialize, Deserialize, Clone)]
struct Metrics {
    #[serde(default)]
    serverfps: u64,
    #[serde(default)]
    currentplayernum: u64,
    #[serde(default)]
    serverframetime: f64,
    #[serde(default)]
    maxplayernum: u64,
    #[serde(default)]
    uptime: u64,
    #[serde(default)]
    basecampnum: u64,
    #[serde(default)]
    days: u64,
}
#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Player {
    #[serde(default)]
    name: String,
    #[serde(default)]
    account_name: String,
    #[serde(default)]
    player_id: String,
    #[serde(default)]
    user_id: String,
    #[serde(default)]
    ip: String,
    #[serde(default)]
    ping: f64,
    #[serde(rename = "location_x", default)]
    location_x: f64,
    #[serde(rename = "location_y", default)]
    location_y: f64,
    #[serde(default)]
    level: u64,
    #[serde(rename = "building_count", default)]
    building_count: u64,
}
#[derive(Serialize, Deserialize)]
struct PlayersResponse {
    #[serde(default)]
    players: Vec<Player>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct GameDataActor {
    #[serde(default, rename(deserialize = "Type"))]
    actor_type: Option<String>,
    #[serde(default, rename(deserialize = "UnitType"))]
    unit_type: Option<String>,
    #[serde(default, rename(deserialize = "NickName"), alias = "Name")]
    name: Option<String>,
    #[serde(default, rename(deserialize = "GuildID"))]
    guild_id: Option<String>,
    #[serde(default, rename(deserialize = "GuildName"))]
    guild_name: Option<String>,
    #[serde(default, rename(deserialize = "Class"))]
    class_name: Option<String>,
    #[serde(default, rename(deserialize = "userid"), alias = "userId")]
    user_id: Option<String>,
    #[serde(default, rename(deserialize = "ip"))]
    ip: Option<String>,
    #[serde(default, rename(deserialize = "LocationX"))]
    location_x: Option<f64>,
    #[serde(default, rename(deserialize = "LocationY"))]
    location_y: Option<f64>,
    #[serde(default, rename(deserialize = "LocationZ"))]
    location_z: Option<f64>,
    #[serde(default, rename(deserialize = "Level"), alias = "level")]
    level: Option<u64>,
    #[serde(default, rename(deserialize = "HP"))]
    hp: Option<f64>,
    #[serde(default, rename = "MaxHP")]
    max_hp: Option<f64>,
    #[serde(default, rename(deserialize = "Action"))]
    action: Option<String>,
    #[serde(default, rename(deserialize = "AI_Action"))]
    ai_action: Option<String>,
    #[serde(default, rename(deserialize = "Gender"))]
    gender: Option<String>,
    #[serde(default, rename(deserialize = "IsBoss"))]
    is_boss: Option<bool>,
    #[serde(default, rename(deserialize = "IsRare"))]
    is_rare: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct GameDataResponse {
    enabled: bool,
    #[serde(default)]
    time: Option<String>,
    #[serde(default)]
    fps: Option<f64>,
    #[serde(default)]
    average_fps: Option<f64>,
    #[serde(default)]
    in_game_time: Option<String>,
    #[serde(default)]
    in_game_days: Option<u64>,
    #[serde(default)]
    actors: Vec<GameDataActor>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    info: ServerInfo,
    metrics: Metrics,
    players: Vec<Player>,
    settings: serde_json::Value,
    game_data: Option<GameDataResponse>,
    refreshed_at: String,
}

/// Custom application error containing an error code and descriptive message string.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AppError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

impl AppError {
    /// Creates a new `AppError` with specified code and message.
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            detail: None,
        }
    }

    pub fn with_detail(code: impl Into<String>, message: impl Into<String>, detail: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            detail: Some(detail.into()),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let Some(detail) = &self.detail {
            write!(f, "[{}] {} ({})", self.code, self.message, detail)
        } else {
            write!(f, "[{}] {}", self.code, self.message)
        }
    }
}

impl std::error::Error for AppError {}

fn get_cached_password(app: &AppHandle) -> Result<String, String> {
    if let Some(state) = app.try_state::<AppCredentialState>() {
        if let Ok(guard) = state.0.lock() {
            if let Some(pwd) = guard.as_ref() {
                return Ok(pwd.clone());
            }
        }
    }
    let pwd = credentials()?
        .get_password()
        .map_err(|_| error("auth", "Saved credentials are unavailable. Connect again."))?;

    if let Some(state) = app.try_state::<AppCredentialState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = Some(pwd.clone());
        }
    }
    Ok(pwd)
}

fn set_cached_password(app: &AppHandle, password: Option<String>) {
    if let Some(state) = app.try_state::<AppCredentialState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = password;
        }
    }
}

fn with_db<F, R>(app: &AppHandle, f: F) -> Result<R, String>
where
    F: FnOnce(&mut rusqlite::Connection) -> Result<R, String>,
{
    if let Some(state) = app.try_state::<AppDbState>() {
        let mut guard = state
            .0
            .lock()
            .map_err(|_| error("db_error", "Failed to acquire database lock."))?;
        f(&mut guard)
    } else {
        let mut conn = open_sqlite_db(app)?;
        f(&mut conn)
    }
}

/// Formats an error code and message into a standardized `[code] message` string.
fn error(code: &str, message: &str) -> String {
    AppError::new(code, message).to_string()
}

fn config_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| error("unknown", "Unable to access application settings."))?;
    fs::create_dir_all(&dir)
        .map_err(|_| error("unknown", "Unable to prepare application settings."))?;
    Ok(dir.join("connection.json"))
}
fn normalize_endpoint(value: &str) -> Result<String, String> {
    let mut url = Url::parse(value.trim()).map_err(|_| {
        error(
            "bad_request",
            "Enter a valid server URL, including http:// or https://.",
        )
    })?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err(error("bad_request", "Enter a valid HTTP server URL."));
    }
    if url.path().is_empty() || url.path() == "/" {
        // Palworld's current REST API is rooted at /v1/api. Accepting a bare
        // server URL keeps the connection screen simple while still allowing
        // an operator to enter a versioned base URL explicitly.
        url.set_path("/v1/api");
    }
    url.set_query(None);
    url.set_fragment(None);
    Ok(url.to_string().trim_end_matches('/').to_string())
}
fn credentials() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT)
        .map_err(|_| error("unknown", "Windows Credential Manager is unavailable."))
}
fn saved_connection(app: &AppHandle) -> Result<Option<ConnectionConfig>, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(path)
        .map_err(|_| error("unknown", "Unable to read saved connection."))?;
    serde_json::from_str(&content)
        .map(Some)
        .map_err(|_| error("unknown", "Saved connection is invalid."))
}
fn save_connection(app: &AppHandle, config: &ConnectionConfig) -> Result<(), String> {
    let text = serde_json::to_string(config)
        .map_err(|_| error("unknown", "Unable to save connection."))?;
    fs::write(config_path(app)?, text).map_err(|_| error("unknown", "Unable to save connection."))
}
async fn fetch<T: for<'a> Deserialize<'a>>(
    client: &Client,
    endpoint: &str,
    path: &str,
) -> Result<T, String> {
    let response = client
        .get(format!("{endpoint}{path}"))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                error("timeout", "The server did not respond in time.")
            } else {
                error("unavailable", "Could not reach the Palworld server.")
            }
        })?;
    match response.status() {
        StatusCode::UNAUTHORIZED => {
            return Err(error("auth", "Credentials were rejected by the server."))
        }
        StatusCode::BAD_REQUEST => {
            return Err(error("bad_request", "The server rejected this request."))
        }
        s if !s.is_success() => {
            return Err(error(
                "unavailable",
                "The server returned an unavailable response.",
            ))
        }
        _ => {}
    }
    response.json().await.map_err(|_| {
        error(
            "malformed_response",
            &format!("The server returned invalid data for {path}."),
        )
    })
}
async fn fetch_game_data(client: &Client, endpoint: &str) -> Option<GameDataResponse> {
    let game_data_url = format!("{endpoint}/game-data");
    match client.get(&game_data_url).send().await {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(raw) = resp.json::<serde_json::Value>().await {
                let time = raw.get("Time").and_then(|v| v.as_str()).map(String::from);
                let fps = raw.get("FPS").and_then(|v| v.as_f64());
                let average_fps = raw.get("AverageFPS").and_then(|v| v.as_f64());
                let in_game_time = raw.get("InGameTime").and_then(|v| v.as_str()).map(String::from);
                let in_game_days = raw.get("InGameDays").and_then(|v| v.as_u64());

                let actors: Vec<GameDataActor> = raw
                    .get("ActorData")
                    .or_else(|| raw.get("actors"))
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .unwrap_or_default();

                Some(GameDataResponse {
                    enabled: true,
                    time,
                    fps,
                    average_fps,
                    in_game_time,
                    in_game_days,
                    actors,
                })
            } else {
                Some(GameDataResponse {
                    enabled: true,
                    time: None,
                    fps: None,
                    average_fps: None,
                    in_game_time: None,
                    in_game_days: None,
                    actors: vec![],
                })
            }
        }
        _ => Some(GameDataResponse {
            enabled: false,
            time: None,
            fps: None,
            average_fps: None,
            in_game_time: None,
            in_game_days: None,
            actors: vec![],
        }),
    }
}

async fn snapshot(config: &ConnectionConfig, password: &str) -> Result<Snapshot, String> {
    let token = base64_encode(format!("{}:{}", config.username, password).as_bytes());
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Basic {token}"))
            .map_err(|_| error("unknown", "Unable to prepare credentials."))?,
    );
    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .pool_idle_timeout(Duration::from_secs(90))
        .pool_max_idle_per_host(10)
        .default_headers(headers)
        .build()
        .map_err(|_| error("unknown", "Unable to create HTTP client."))?;

    // Perform HTTP requests concurrently across telemetry endpoints using tokio join/try_join
    let (telemetry_res, game_data) = tokio::join!(
        async {
            tokio::try_join!(
                fetch::<ServerInfo>(&client, &config.endpoint, "/info"),
                fetch::<Metrics>(&client, &config.endpoint, "/metrics"),
                fetch::<PlayersResponse>(&client, &config.endpoint, "/players"),
                fetch::<serde_json::Value>(&client, &config.endpoint, "/settings"),
            )
        },
        fetch_game_data(&client, &config.endpoint)
    );

    let (info, metrics, players, settings) = telemetry_res?;

    Ok(Snapshot {
        info,
        metrics,
        players: players.players,
        settings,
        game_data,
        refreshed_at: chrono::Utc::now().to_rfc3339(),
    })
}
fn base64_encode(input: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(input)
}
#[tauri::command]
fn get_saved_connection(app: AppHandle) -> Result<Option<ConnectionConfig>, String> {
    saved_connection(&app)
}
#[tauri::command]
async fn connect(app: AppHandle, request: ConnectRequest) -> Result<Snapshot, String> {
    let config = ConnectionConfig {
        endpoint: normalize_endpoint(&request.endpoint)?,
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
async fn refresh_monitor(app: AppHandle) -> Result<Snapshot, String> {
    let config = saved_connection(&app)?
        .ok_or_else(|| error("bad_request", "Connect to a server first."))?;
    let password = get_cached_password(&app)?;
    snapshot(&config, &password).await
}

#[tauri::command]
fn forget_connection(app: AppHandle) -> Result<(), String> {
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

fn get_auth_client(app: &AppHandle) -> Result<(ConnectionConfig, reqwest::Client), String> {
    let config = saved_connection(app)?
        .ok_or_else(|| error("bad_request", "Connect to a server first."))?;
    let password = get_cached_password(app)?;
    let auth = format!("{}:{}", config.username, password);
    let auth_header = format!("Basic {}", base64_encode(auth.as_bytes()));
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::AUTHORIZATION,
        reqwest::header::HeaderValue::from_str(&auth_header)
            .map_err(|_| error("auth", "Invalid authorization header."))?,
    );
    let client = reqwest::Client::builder()
        .default_headers(headers)
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| error("network", &e.to_string()))?;
    Ok((config, client))
}

#[tauri::command]
async fn announce_message(app: AppHandle, message: String) -> Result<(), String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/announce", config.endpoint))
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
async fn save_world(app: AppHandle) -> Result<(), String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/save", config.endpoint))
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
async fn shutdown_server(
    app: AppHandle,
    wait_time: Option<u64>,
    waitTime: Option<u64>,
    message: Option<String>,
) -> Result<(), String> {
    let wt = wait_time.or(waitTime).unwrap_or(60);
    let msg = message.unwrap_or_else(|| "Server is shutting down.".to_string());
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/shutdown", config.endpoint))
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
async fn stop_server(app: AppHandle) -> Result<(), String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/stop", config.endpoint))
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
async fn kick_player(
    app: AppHandle,
    user_id: Option<String>,
    userId: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let uid = user_id.or(userId).ok_or_else(|| error("bad_request", "userId is required"))?;
    let msg = message.unwrap_or_default();
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/kick", config.endpoint))
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
async fn ban_player(
    app: AppHandle,
    user_id: Option<String>,
    userId: Option<String>,
    message: Option<String>,
) -> Result<(), String> {
    let uid = user_id.or(userId).ok_or_else(|| error("bad_request", "userId is required"))?;
    let msg = message.unwrap_or_default();
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/ban", config.endpoint))
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
async fn unban_player(
    app: AppHandle,
    user_id: Option<String>,
    userId: Option<String>,
) -> Result<(), String> {
    let uid = user_id.or(userId).ok_or_else(|| error("bad_request", "userId is required"))?;
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .post(&format!("{}/unban", config.endpoint))
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
async fn fetch_ban_list(app: AppHandle) -> Result<serde_json::Value, String> {
    let (config, client) = get_auth_client(&app)?;
    let res = client
        .get(&format!("{}/banlist", config.endpoint))
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

#[derive(Default)]
struct MonitorState {
    task: std::sync::Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
}

fn stop_background_monitor(app: &AppHandle) {
    if let Some(state) = app.try_state::<MonitorState>() {
        if let Ok(mut guard) = state.task.lock() {
            if let Some(handle) = guard.take() {
                handle.abort();
            }
        }
    }
}

fn start_background_monitor(app: &AppHandle, interval_secs: u64) {
    stop_background_monitor(app);

    let app_handle = app.clone();
    let base_secs = if interval_secs == 0 { 3 } else { interval_secs };

    let handle = tauri::async_runtime::spawn(async move {
        let mut consecutive_failures: u32 = 0;

        loop {
            let sleep_secs = if consecutive_failures == 0 {
                base_secs
            } else {
                let backoff = base_secs.saturating_mul(1u64 << consecutive_failures.min(5));
                std::cmp::min(backoff, 30)
            };

            tokio::time::sleep(Duration::from_secs(sleep_secs)).await;

            let config_res = saved_connection(&app_handle);
            let password_res = get_cached_password(&app_handle);

            match (config_res, password_res) {
                (Ok(Some(config)), Ok(password)) => {
                    match snapshot(&config, &password).await {
                        Ok(snap) => {
                            consecutive_failures = 0;
                            let app_for_sync = app_handle.clone();
                            let players_for_sync = snap.players.clone();
                            tokio::task::spawn_blocking(move || {
                                sync_players_to_sqlite(&app_for_sync, &players_for_sync, base_secs);
                            });
                            let _ = app_handle.emit("telemetry-update", snap);
                        }
                        Err(err_msg) => {
                            consecutive_failures = consecutive_failures.saturating_add(1);
                            let _ = app_handle.emit("telemetry-error", err_msg);
                        }
                    }
                }
                _ => break,
            }
        }
    });

    if let Some(state) = app.try_state::<MonitorState>() {
        if let Ok(mut guard) = state.task.lock() {
            *guard = Some(handle);
        }
    }
}

#[tauri::command]
fn start_monitoring(app: AppHandle, interval_secs: Option<u64>) -> Result<(), String> {
    start_background_monitor(&app, interval_secs.unwrap_or(3));
    Ok(())
}

#[tauri::command]
fn stop_monitoring(app: AppHandle) -> Result<(), String> {
    stop_background_monitor(&app);
    Ok(())
}

// SQLite Embedded Habitant History Structs & Handlers

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct SqliteInfo {
    db_path: String,
    connected: bool,
    recorded_players_count: i64,
    online_players_count: i64,
    total_playtime_seconds: i64,
    file_size_bytes: u64,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct HabitantHistoryRecord {
    player_id: String,
    user_id: String,
    account_name: String,
    name: String,
    first_seen: String,
    last_seen: String,
    total_playtime_seconds: i64,
    last_level: i32,
    max_level: i32,
    last_ip: String,
    last_location_x: f64,
    last_location_y: f64,
    building_count: i32,
    is_online: bool,
    updated_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct HabitantSessionRecord {
    id: i32,
    player_id: String,
    user_id: String,
    name: String,
    joined_at: String,
    left_at: Option<String>,
    session_seconds: i64,
    final_level: i32,
    ip: String,
}

fn sqlite_db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| error("unknown", "Unable to access application directory."))?;
    fs::create_dir_all(&dir)
        .map_err(|_| error("unknown", "Unable to prepare application storage directory."))?;
    Ok(dir.join("habitant_history.db"))
}

fn open_sqlite_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
    let path = sqlite_db_path(app)?;
    let conn = rusqlite::Connection::open(&path)
        .map_err(|e| error("db_error", &format!("Failed to open SQLite database: {e}")))?;

    let _ = conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    );
    init_sqlite_tables(&conn)?;
    Ok(conn)
}

fn init_sqlite_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    let create_history = "
        CREATE TABLE IF NOT EXISTS habitant_history (
            player_id TEXT PRIMARY KEY,
            user_id TEXT,
            account_name TEXT,
            name TEXT NOT NULL,
            first_seen TEXT NOT NULL,
            last_seen TEXT NOT NULL,
            total_playtime_seconds INTEGER NOT NULL DEFAULT 0,
            last_level INTEGER NOT NULL DEFAULT 1,
            max_level INTEGER NOT NULL DEFAULT 1,
            last_ip TEXT,
            last_location_x REAL DEFAULT 0,
            last_location_y REAL DEFAULT 0,
            building_count INTEGER DEFAULT 0,
            is_online INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL
        );
    ";
    let create_sessions = "
        CREATE TABLE IF NOT EXISTS habitant_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            user_id TEXT,
            name TEXT,
            joined_at TEXT NOT NULL,
            left_at TEXT,
            session_seconds INTEGER DEFAULT 0,
            final_level INTEGER DEFAULT 1,
            ip TEXT
        );
    ";

    conn.execute_batch(&format!("{create_history} {create_sessions}"))
        .map_err(|e| error("db_error", &format!("Failed to initialize SQLite tables: {e}")))?;

    let _ = conn.execute_batch("
        CREATE INDEX IF NOT EXISTS idx_sessions_active ON habitant_sessions(player_id, left_at);
        CREATE INDEX IF NOT EXISTS idx_history_online ON habitant_history(is_online);
    ");

    Ok(())
}

fn sync_players_to_sqlite(app: &AppHandle, players: &[Player], interval_secs: u64) {
    let _ = with_db(app, |conn| {
        let tx = conn
            .transaction()
            .map_err(|e| error("db_error", &e.to_string()))?;

        let now_str = chrono::Utc::now().to_rfc3339();
        let now_sec = interval_secs as i64;
        let mut online_player_ids: Vec<String> = Vec::new();

        for p in players {
            let p_id = if !p.player_id.is_empty() {
                p.player_id.clone()
            } else if !p.user_id.is_empty() {
                p.user_id.clone()
            } else {
                p.name.clone()
            };

            if p_id.is_empty() {
                continue;
            }

            online_player_ids.push(p_id.clone());

            let level_i32 = p.level as i32;
            let b_count_i32 = p.building_count as i32;

            let upsert_query = "
                INSERT INTO habitant_history (
                    player_id, user_id, account_name, name, first_seen, last_seen,
                    total_playtime_seconds, last_level, max_level, last_ip,
                    last_location_x, last_location_y, building_count, is_online, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, ?7, ?8, ?9, ?10, ?11, 1, ?5)
                ON CONFLICT(player_id) DO UPDATE SET
                    user_id = excluded.user_id,
                    account_name = excluded.account_name,
                    name = excluded.name,
                    last_seen = excluded.last_seen,
                    total_playtime_seconds = habitant_history.total_playtime_seconds + excluded.total_playtime_seconds,
                    last_level = excluded.last_level,
                    max_level = MAX(habitant_history.max_level, excluded.last_level),
                    last_ip = excluded.last_ip,
                    last_location_x = excluded.last_location_x,
                    last_location_y = excluded.last_location_y,
                    building_count = excluded.building_count,
                    is_online = 1,
                    updated_at = excluded.updated_at;
            ";

            let _ = tx.execute(
                upsert_query,
                rusqlite::params![
                    p_id,
                    p.user_id,
                    p.account_name,
                    p.name,
                    now_str,
                    now_sec,
                    level_i32,
                    p.ip,
                    p.location_x,
                    p.location_y,
                    b_count_i32
                ],
            );

            let has_open_session: bool = tx
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM habitant_sessions WHERE player_id = ?1 AND left_at IS NULL)",
                    rusqlite::params![p_id],
                    |row| row.get(0),
                )
                .unwrap_or(false);

            if !has_open_session {
                let _ = tx.execute(
                    "INSERT INTO habitant_sessions (player_id, user_id, name, joined_at, final_level, ip) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![p_id, p.user_id, p.name, now_str, level_i32, p.ip],
                );
            } else {
                let _ = tx.execute(
                    "UPDATE habitant_sessions SET final_level = ?1, session_seconds = session_seconds + ?2 WHERE player_id = ?3 AND left_at IS NULL",
                    rusqlite::params![level_i32, now_sec, p_id],
                );
            }
        }

        if online_player_ids.is_empty() {
            let _ = tx.execute(
                "UPDATE habitant_history SET is_online = 0, updated_at = ?1 WHERE is_online = 1",
                rusqlite::params![now_str],
            );
            let _ = tx.execute(
                "UPDATE habitant_sessions SET left_at = ?1 WHERE left_at IS NULL",
                rusqlite::params![now_str],
            );
        } else {
            let placeholders: Vec<String> = (0..online_player_ids.len()).map(|i| format!("?{}", i + 2)).collect();
            let query_history = format!(
                "UPDATE habitant_history SET is_online = 0, updated_at = ?1 WHERE is_online = 1 AND player_id NOT IN ({})",
                placeholders.join(",")
            );
            let query_sessions = format!(
                "UPDATE habitant_sessions SET left_at = ?1 WHERE left_at IS NULL AND player_id NOT IN ({})",
                placeholders.join(",")
            );

            let mut params: Vec<&dyn rusqlite::ToSql> = vec![&now_str];
            for id in &online_player_ids {
                params.push(id);
            }

            let _ = tx.execute(&query_history, params.as_slice());
            let _ = tx.execute(&query_sessions, params.as_slice());
        }

        tx.commit().map_err(|e| error("db_error", &e.to_string()))?;
        Ok(())
    });
}

#[tauri::command]
fn get_sqlite_info(app: AppHandle) -> Result<SqliteInfo, String> {
    let path = sqlite_db_path(&app)?;
    let file_size_bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    with_db(&app, |conn| {
        let recorded_players_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM habitant_history", [], |r| r.get(0))
            .unwrap_or(0);

        let online_players_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM habitant_history WHERE is_online = 1", [], |r| r.get(0))
            .unwrap_or(0);

        let total_playtime_seconds: i64 = conn
            .query_row("SELECT COALESCE(SUM(total_playtime_seconds), 0) FROM habitant_history", [], |r| r.get(0))
            .unwrap_or(0);

        Ok(SqliteInfo {
            db_path: path.to_string_lossy().to_string(),
            connected: true,
            recorded_players_count,
            online_players_count,
            total_playtime_seconds,
            file_size_bytes,
        })
    })
}

#[tauri::command]
fn fetch_habitant_history(app: AppHandle) -> Result<Vec<HabitantHistoryRecord>, String> {
    with_db(&app, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT player_id, user_id, account_name, name, first_seen, last_seen,
                        total_playtime_seconds, last_level, max_level, last_ip,
                        last_location_x, last_location_y, building_count, is_online, updated_at
                 FROM habitant_history ORDER BY last_seen DESC LIMIT 500",
            )
            .map_err(|e| error("db_error", &format!("Query prep error: {e}")))?;

        let rows = stmt
            .query_map([], |r| {
                let is_online_int: i32 = r.get(13)?;
                Ok(HabitantHistoryRecord {
                    player_id: r.get(0)?,
                    user_id: r.get(1)?,
                    account_name: r.get(2)?,
                    name: r.get(3)?,
                    first_seen: r.get(4)?,
                    last_seen: r.get(5)?,
                    total_playtime_seconds: r.get(6)?,
                    last_level: r.get(7)?,
                    max_level: r.get(8)?,
                    last_ip: r.get(9)?,
                    last_location_x: r.get(10)?,
                    last_location_y: r.get(11)?,
                    building_count: r.get(12)?,
                    is_online: is_online_int != 0,
                    updated_at: r.get(14)?,
                })
            })
            .map_err(|e| error("db_error", &format!("Query execution error: {e}")))?;

        let mut records = Vec::new();
        for r in rows {
            if let Ok(rec) = r {
                records.push(rec);
            }
        }

        Ok(records)
    })
}

#[tauri::command]
fn fetch_player_sessions(
    app: AppHandle,
    player_id: String,
) -> Result<Vec<HabitantSessionRecord>, String> {
    with_db(&app, |conn| {
        let mut stmt = conn
            .prepare(
                "SELECT id, player_id, user_id, name, joined_at, left_at, session_seconds, final_level, ip
                 FROM habitant_sessions WHERE player_id = ?1 ORDER BY joined_at DESC LIMIT 100",
            )
            .map_err(|e| error("db_error", &format!("Query prep error: {e}")))?;

        let rows = stmt
            .query_map(rusqlite::params![player_id], |r| {
                Ok(HabitantSessionRecord {
                    id: r.get(0)?,
                    player_id: r.get(1)?,
                    user_id: r.get(2)?,
                    name: r.get(3)?,
                    joined_at: r.get(4)?,
                    left_at: r.get(5)?,
                    session_seconds: r.get(6)?,
                    final_level: r.get(7)?,
                    ip: r.get(8)?,
                })
            })
            .map_err(|e| error("db_error", &format!("Query execution error: {e}")))?;

        let mut sessions = Vec::new();
        for r in rows {
            if let Ok(s) = r {
                sessions.push(s);
            }
        }

        Ok(sessions)
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(MonitorState::default());
            app.manage(AppCredentialState::default());
            if let Ok(conn) = open_sqlite_db(app.handle()) {
                app.manage(AppDbState(std::sync::Mutex::new(conn)));
            }
            if let Ok(Some(_)) = saved_connection(app.handle()) {
                start_background_monitor(app.handle(), 3);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_saved_connection,
            connect,
            refresh_monitor,
            forget_connection,
            start_monitoring,
            stop_monitoring,
            announce_message,
            save_world,
            shutdown_server,
            stop_server,
            kick_player,
            ban_player,
            unban_player,
            fetch_ban_list,
            get_sqlite_info,
            fetch_habitant_history,
            fetch_player_sessions
        ])
        .run(tauri::generate_context!())
        .expect("error while running Palworld Server Monitor");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_error_formatting() {
        let err = AppError::new("auth", "Invalid password");
        assert_eq!(err.to_string(), "[auth] Invalid password");
        assert_eq!(err.code, "auth");
        assert_eq!(err.message, "Invalid password");
    }

    #[test]
    fn endpoint_is_normalized() {
        assert_eq!(
            normalize_endpoint("http://localhost:8212/path").unwrap(),
            "http://localhost:8212/path"
        );
    }
    #[test]
    fn bare_endpoint_uses_palworld_api_base() {
        assert_eq!(
            normalize_endpoint("http://localhost:8212").unwrap(),
            "http://localhost:8212/v1/api"
        );
    }
    #[test]
    fn invalid_endpoint_is_rejected() {
        assert!(normalize_endpoint("localhost:8212").is_err());
    }
    #[test]
    fn basic_auth_encoding_is_correct() {
        assert_eq!(base64_encode(b"admin:secret"), "YWRtaW46c2VjcmV0");
    }
    #[test]
    fn player_serialization_preserves_palworld_field_names() {
        let player = Player {
            name: "PalUser".into(),
            account_name: "paluser".into(),
            player_id: "player".into(),
            user_id: "user".into(),
            ip: "127.0.0.1".into(),
            ping: 5.0,
            location_x: 1.0,
            location_y: 2.0,
            level: 1,
            building_count: 3,
        };
        let value = serde_json::to_value(player).unwrap();
        assert_eq!(value["location_x"], 1.0);
        assert_eq!(value["building_count"], 3);
    }
    #[test]
    fn game_data_actor_deserialization_handles_aliases() {
        let json_data = serde_json::json!({
            "Type": "Player",
            "NickName": "TestPlayer",
            "userid": "12345",
            "LocationX": 100.5,
            "LocationY": 200.5,
            "Level": 50
        });
        let actor: GameDataActor = serde_json::from_value(json_data).unwrap();
        assert_eq!(actor.name.as_deref(), Some("TestPlayer"));
        assert_eq!(actor.user_id.as_deref(), Some("12345"));
        assert_eq!(actor.location_x, Some(100.5));
        assert_eq!(actor.level, Some(50));
    }
}
