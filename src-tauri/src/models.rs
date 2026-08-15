use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectRequest {
    pub endpoint: String,
    pub username: String,
    pub password: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionConfig {
    pub endpoint: String,
    pub username: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ServerInfo {
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub servername: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub worldguid: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Metrics {
    #[serde(default)]
    pub serverfps: u64,
    #[serde(default)]
    pub currentplayernum: u64,
    #[serde(default)]
    pub serverframetime: f64,
    #[serde(default)]
    pub maxplayernum: u64,
    #[serde(default)]
    pub uptime: u64,
    #[serde(default)]
    pub basecampnum: u64,
    #[serde(default)]
    pub days: u64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub account_name: String,
    #[serde(default)]
    pub player_id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub ip: String,
    #[serde(default)]
    pub ping: f64,
    #[serde(rename = "location_x", default)]
    pub location_x: f64,
    #[serde(rename = "location_y", default)]
    pub location_y: f64,
    #[serde(default)]
    pub level: u64,
    #[serde(rename = "building_count", default)]
    pub building_count: u64,
}

#[derive(Serialize, Deserialize)]
pub struct PlayersResponse {
    #[serde(default)]
    pub players: Vec<Player>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GameDataActor {
    #[serde(default, rename(deserialize = "Type"))]
    pub actor_type: Option<String>,
    #[serde(default, rename(deserialize = "UnitType"))]
    pub unit_type: Option<String>,
    #[serde(default, rename(deserialize = "NickName"), alias = "Name")]
    pub name: Option<String>,
    #[serde(default, rename(deserialize = "GuildID"))]
    pub guild_id: Option<String>,
    #[serde(default, rename(deserialize = "GuildName"))]
    pub guild_name: Option<String>,
    #[serde(default, rename(deserialize = "Class"))]
    pub class_name: Option<String>,
    #[serde(default, rename(deserialize = "userid"), alias = "userId")]
    pub user_id: Option<String>,
    #[serde(default, rename(deserialize = "ip"))]
    pub ip: Option<String>,
    #[serde(default, rename(deserialize = "LocationX"))]
    pub location_x: Option<f64>,
    #[serde(default, rename(deserialize = "LocationY"))]
    pub location_y: Option<f64>,
    #[serde(default, rename(deserialize = "LocationZ"))]
    pub location_z: Option<f64>,
    #[serde(default, rename(deserialize = "Level"), alias = "level")]
    pub level: Option<u64>,
    #[serde(default, rename(deserialize = "HP"))]
    pub hp: Option<f64>,
    #[serde(default, rename = "MaxHP")]
    pub max_hp: Option<f64>,
    #[serde(default, rename(deserialize = "Action"))]
    pub action: Option<String>,
    #[serde(default, rename(deserialize = "AI_Action"))]
    pub ai_action: Option<String>,
    #[serde(default, rename(deserialize = "Gender"))]
    pub gender: Option<String>,
    #[serde(default, rename(deserialize = "IsBoss"))]
    pub is_boss: Option<bool>,
    #[serde(default, rename(deserialize = "IsRare"))]
    pub is_rare: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameDataResponse {
    pub enabled: bool,
    #[serde(default)]
    pub time: Option<String>,
    #[serde(default)]
    pub fps: Option<f64>,
    #[serde(default)]
    pub average_fps: Option<f64>,
    #[serde(default)]
    pub in_game_time: Option<String>,
    #[serde(default)]
    pub in_game_days: Option<u64>,
    #[serde(default)]
    pub actors: Vec<GameDataActor>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub info: ServerInfo,
    pub metrics: Metrics,
    pub players: Vec<Player>,
    pub settings: serde_json::Value,
    pub game_data: Option<GameDataResponse>,
    pub refreshed_at: String,
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

pub fn error(code: &str, message: &str) -> String {
    AppError::new(code, message).to_string()
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SqliteInfo {
    pub db_path: String,
    pub connected: bool,
    pub recorded_players_count: i64,
    pub online_players_count: i64,
    pub total_playtime_seconds: i64,
    pub file_size_bytes: u64,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HabitantHistoryRecord {
    pub player_id: String,
    pub user_id: String,
    pub account_name: String,
    pub name: String,
    pub first_seen: String,
    pub last_seen: String,
    pub total_playtime_seconds: i64,
    pub last_level: i32,
    pub max_level: i32,
    pub last_ip: String,
    pub last_location_x: f64,
    pub last_location_y: f64,
    pub building_count: i32,
    pub is_online: bool,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HabitantSessionRecord {
    pub id: i32,
    pub player_id: String,
    pub user_id: String,
    pub name: String,
    pub joined_at: String,
    pub left_at: Option<String>,
    pub session_seconds: i64,
    pub final_level: i32,
    pub ip: String,
}
