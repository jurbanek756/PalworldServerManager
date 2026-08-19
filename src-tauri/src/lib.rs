pub mod api;
pub mod commands;
pub mod db;
pub mod models;
pub mod tray;

use api::{saved_connection, start_background_monitor, AppCredentialState, MonitorState};
use db::{open_sqlite_db, AppDbState};
use tauri::Manager;

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
            if let Err(e) = tray::create_tray(app.handle()) {
                eprintln!("Failed to create system tray: {e}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_saved_connection,
            commands::connect,
            commands::refresh_monitor,
            commands::forget_connection,
            commands::start_monitoring,
            commands::stop_monitoring,
            commands::announce_message,
            commands::save_world,
            commands::shutdown_server,
            commands::stop_server,
            commands::kick_player,
            commands::ban_player,
            commands::unban_player,
            commands::fetch_ban_list,
            commands::get_sqlite_info,
            commands::fetch_habitant_history,
            commands::fetch_player_sessions
        ])
        .run(tauri::generate_context!())
        .expect("error while running Palworld Server Monitor");
}

#[cfg(test)]
mod tests {
    use crate::api::{base64_encode, normalize_endpoint};
    use crate::models::{AppError, GameDataActor, Player};

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
