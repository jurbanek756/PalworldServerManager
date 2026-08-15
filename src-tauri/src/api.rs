use base64::Engine;
use keyring::Entry;
use reqwest::{
    header::{HeaderMap, HeaderValue, AUTHORIZATION},
    Client, StatusCode,
};
use serde::Deserialize;
use std::{fs, time::Duration};
use tauri::{AppHandle, Emitter, Manager};
use url::Url;

use crate::db::sync_players_to_sqlite;
use crate::models::{
    error, ConnectionConfig, GameDataActor, GameDataResponse, Metrics,
    PlayersResponse, ServerInfo, Snapshot,
};

pub const SERVICE: &str = "Palworld Server Monitor";
pub const ACCOUNT: &str = "palworld-rest-api";

#[derive(Default)]
pub struct AppCredentialState(pub std::sync::Mutex<Option<String>>);

#[derive(Default)]
pub struct MonitorState {
    pub task: std::sync::Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
}

pub fn base64_encode(input: &[u8]) -> String {
    base64::engine::general_purpose::STANDARD.encode(input)
}

pub fn credentials() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT)
        .map_err(|_| error("unknown", "Windows Credential Manager is unavailable."))
}

pub fn get_cached_password(app: &AppHandle) -> Result<String, String> {
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

pub fn set_cached_password(app: &AppHandle, password: Option<String>) {
    if let Some(state) = app.try_state::<AppCredentialState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = password;
        }
    }
}

pub fn config_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| error("unknown", "Unable to access application settings."))?;
    fs::create_dir_all(&dir)
        .map_err(|_| error("unknown", "Unable to prepare application settings."))?;
    Ok(dir.join("connection.json"))
}

pub fn normalize_endpoint(value: &str) -> Result<String, String> {
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
        url.set_path("/v1/api");
    }
    url.set_query(None);
    url.set_fragment(None);
    Ok(url.to_string().trim_end_matches('/').to_string())
}

pub fn saved_connection(app: &AppHandle) -> Result<Option<ConnectionConfig>, String> {
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

pub fn save_connection(app: &AppHandle, config: &ConnectionConfig) -> Result<(), String> {
    let text = serde_json::to_string(config)
        .map_err(|_| error("unknown", "Unable to save connection."))?;
    fs::write(config_path(app)?, text).map_err(|_| error("unknown", "Unable to save connection."))
}

pub async fn fetch<T: for<'a> Deserialize<'a>>(
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

pub async fn fetch_game_data(client: &Client, endpoint: &str) -> Option<GameDataResponse> {
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

pub async fn snapshot(config: &ConnectionConfig, password: &str) -> Result<Snapshot, String> {
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

pub fn get_auth_client(app: &AppHandle) -> Result<(ConnectionConfig, reqwest::Client), String> {
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

pub fn stop_background_monitor(app: &AppHandle) {
    if let Some(state) = app.try_state::<MonitorState>() {
        if let Ok(mut guard) = state.task.lock() {
            if let Some(handle) = guard.take() {
                handle.abort();
            }
        }
    }
}

pub fn start_background_monitor(app: &AppHandle, interval_secs: u64) {
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
