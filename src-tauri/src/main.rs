#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod history;
mod state;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state::AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_categories,
            commands::scan,
            commands::analyze,
            commands::clean,
            commands::load_config,
            commands::save_config,
            commands::is_elevated,
            commands::restart_as_admin,
            commands::cancel_scan,
            commands::scan_dev_artifacts,
            commands::clean_dev_artifact_entries,
            commands::scan_large_files,
            commands::delete_large_entries,
            commands::get_clean_history,
            commands::get_history_stats,
            commands::record_clean_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
