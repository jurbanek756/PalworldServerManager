use crate::models::{
    error, HabitantHistoryRecord, HabitantSessionRecord, Player, SqliteInfo,
};
use std::fs;
use tauri::{AppHandle, Manager};

pub struct AppDbState(pub std::sync::Mutex<rusqlite::Connection>);

pub fn sqlite_db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|_| error("unknown", "Unable to access application directory."))?;
    fs::create_dir_all(&dir)
        .map_err(|_| error("unknown", "Unable to prepare application storage directory."))?;
    Ok(dir.join("habitant_history.db"))
}

pub fn open_sqlite_db(app: &AppHandle) -> Result<rusqlite::Connection, String> {
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

pub fn with_db<F, R>(app: &AppHandle, f: F) -> Result<R, String>
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

pub fn init_sqlite_tables(conn: &rusqlite::Connection) -> Result<(), String> {
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
        CREATE INDEX IF NOT EXISTS idx_history_last_seen ON habitant_history(last_seen DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_joined_at ON habitant_sessions(joined_at DESC);
    ");

    Ok(())
}

pub fn sync_players_to_sqlite(app: &AppHandle, players: &[Player], interval_secs: u64) {
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

            // Optimized active session update / insert in a single query attempt
            let updated_rows = tx.execute(
                "UPDATE habitant_sessions SET final_level = ?1, session_seconds = session_seconds + ?2 WHERE player_id = ?3 AND left_at IS NULL",
                rusqlite::params![level_i32, now_sec, p_id],
            ).unwrap_or(0);

            if updated_rows == 0 {
                let _ = tx.execute(
                    "INSERT INTO habitant_sessions (player_id, user_id, name, joined_at, final_level, ip) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![p_id, p.user_id, p.name, now_str, level_i32, p.ip],
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

pub fn fetch_sqlite_info(app: &AppHandle) -> Result<SqliteInfo, String> {
    let path = sqlite_db_path(app)?;
    let file_size_bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    with_db(app, |conn| {
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

pub fn query_habitant_history(app: &AppHandle) -> Result<Vec<HabitantHistoryRecord>, String> {
    with_db(app, |conn| {
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
        for rec in rows.flatten() {
            records.push(rec);
        }

        Ok(records)
    })
}

pub fn query_player_sessions(
    app: &AppHandle,
    player_id: String,
) -> Result<Vec<HabitantSessionRecord>, String> {
    with_db(app, |conn| {
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
        for s in rows.flatten() {
            sessions.push(s);
        }

        Ok(sessions)
    })
}
