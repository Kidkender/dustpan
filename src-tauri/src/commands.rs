use cleaner_core::{analyzer, categories, cleaner, config, dev_artifacts, large_files, platform, scanner};
use serde::Serialize;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, State, Window};

use crate::history::HistoryEntry;
use crate::state::AppState;

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

#[derive(Clone, Serialize)]
pub struct ScanProgressPayload {
    pub category_id: String,
    pub files_found: usize,
    pub bytes_found: u64,
    pub categories_done: usize,
    pub categories_total: usize,
}

#[derive(Clone, Serialize)]
pub struct DevScanProgressPayload {
    pub found_count: usize,
    pub total_size_bytes: u64,
    pub current_project: String,
}

#[derive(Clone, Serialize)]
pub struct CleanProgressPayload {
    pub deleted_count: usize,
    pub freed_bytes: u64,
    pub total_files: usize,
    pub current_file: String,
}

#[derive(Clone, Serialize)]
pub struct LargeScanProgressPayload {
    pub scanned_count: u64,
    pub found_count: usize,
}

// ---------------------------------------------------------------------------
// Junk scan / analyze / clean
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_categories() -> Vec<categories::JunkCategory> {
    categories::ALL_CATEGORIES.to_vec()
}

#[tauri::command]
pub async fn scan(
    category_ids: Vec<String>,
    window: Window,
    state: State<'_, AppState>,
) -> Result<Vec<scanner::ScanResult>, String> {
    let total = category_ids.len();

    let results = tauri::async_runtime::spawn_blocking(move || {
        let mut all = Vec::with_capacity(total);
        for (i, id) in category_ids.iter().enumerate() {
            let result = scanner::scan_category_by_id(id);
            let _ = window.emit(
                "scan-progress",
                ScanProgressPayload {
                    category_id: id.clone(),
                    files_found: result.files.len(),
                    bytes_found: result.total_bytes,
                    categories_done: i + 1,
                    categories_total: total,
                },
            );
            all.push(result);
        }
        all
    })
    .await
    .map_err(|e| e.to_string())?;

    *state.scan_cache.lock().unwrap() = Some(results.clone());
    Ok(results)
}

#[tauri::command]
pub fn analyze(state: State<'_, AppState>) -> Result<analyzer::AnalysisReport, String> {
    let cache = state.scan_cache.lock().unwrap();
    match cache.as_ref() {
        Some(results) => Ok(analyzer::analyze(results.clone())),
        None => Err("No scan results available. Run scan first.".into()),
    }
}

#[tauri::command]
pub async fn clean(
    category_ids: Vec<String>,
    dry_run: bool,
    use_recycle_bin: bool,
    window: Window,
    state: State<'_, AppState>,
) -> Result<cleaner::CleanReport, String> {
    let files: Vec<scanner::ScannedFile> = {
        let cache = state.scan_cache.lock().unwrap();
        match cache.as_ref() {
            Some(results) => results
                .iter()
                .filter(|r| category_ids.contains(&r.category_id.to_string()))
                .flat_map(|r| r.files.iter().cloned())
                .collect(),
            None => return Err("No scan results available. Run scan first.".into()),
        }
    };

    let total = files.len();

    let report = tauri::async_runtime::spawn_blocking(move || {
        let mut last_emit = std::time::Instant::now();
        cleaner::clean_with_callback(&files, dry_run, use_recycle_bin, |deleted_count, freed_bytes| {
            let now = std::time::Instant::now();
            // Emit at most every 150ms or every 100 files to avoid flooding IPC
            if deleted_count % 100 == 0 || now.duration_since(last_emit).as_millis() >= 150 {
                last_emit = now;
                let current_file = files
                    .get(deleted_count.saturating_sub(1))
                    .map(|f| f.path.to_string_lossy().to_string())
                    .unwrap_or_default();
                let _ = window.emit(
                    "clean-progress",
                    CleanProgressPayload {
                        deleted_count,
                        freed_bytes,
                        total_files: total,
                        current_file,
                    },
                );
            }
        })
    })
    .await
    .map_err(|e| e.to_string())?;

    // Free scan cache — no longer needed after clean
    *state.scan_cache.lock().unwrap() = None;

    Ok(report)
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn load_config() -> config::Config {
    config::load()
}

#[tauri::command]
pub fn save_config(config: config::Config) -> Result<(), String> {
    config::save(&config).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Elevation
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn is_elevated() -> bool {
    platform::is_elevated()
}

#[tauri::command]
pub fn restart_as_admin(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;

        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_wide: Vec<u16> = exe.as_os_str().encode_wide().chain(Some(0)).collect();
        let verb: Vec<u16> = "runas\0".encode_utf16().collect();

        unsafe {
            use windows::Win32::UI::Shell::ShellExecuteW;
            use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
            use windows::core::PCWSTR;

            ShellExecuteW(
                None,
                PCWSTR(verb.as_ptr()),
                PCWSTR(exe_wide.as_ptr()),
                None,
                None,
                SW_SHOWNORMAL,
            );
        }

        app.exit(0);
        Ok(())
    }

    #[cfg(not(windows))]
    {
        let _ = app;
        Err("restart_as_admin is only supported on Windows".into())
    }
}

// ---------------------------------------------------------------------------
// Dev Artifacts
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn cancel_scan(state: State<'_, AppState>) {
    state.scan_cancelled.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn scan_dev_artifacts(
    min_age_days: u32,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<dev_artifacts::DevArtifactEntry>, String> {
    state.scan_cancelled.store(false, Ordering::Relaxed);
    let roots = dev_artifacts::default_scan_roots();
    let cancelled = state.scan_cancelled.clone();

    let results = tauri::async_runtime::spawn_blocking(move || {
        dev_artifacts::scan_dev_artifacts(
            min_age_days,
            &roots,
            &cancelled,
            |found_count, total_size_bytes| {
                let _ = app.emit(
                    "dev-scan-progress",
                    DevScanProgressPayload {
                        found_count,
                        total_size_bytes,
                        current_project: String::new(),
                    },
                );
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?;

    *state.dev_artifact_cache.lock().unwrap() = Some(results.clone());
    Ok(results)
}

#[tauri::command]
pub async fn clean_dev_artifact_entries(
    artifact_paths: Vec<String>,
    dry_run: bool,
    use_recycle_bin: bool,
    state: State<'_, AppState>,
) -> Result<cleaner::CleanReport, String> {
    let entries: Vec<dev_artifacts::DevArtifactEntry> = {
        let cache = state.dev_artifact_cache.lock().unwrap();
        cache
            .as_ref()
            .map(|c| {
                c.iter()
                    .filter(|e| {
                        artifact_paths
                            .iter()
                            .any(|p| e.artifact_path.to_string_lossy() == p.as_str())
                    })
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    };

    let report = tauri::async_runtime::spawn_blocking(move || {
        dev_artifacts::clean_dev_artifacts(&entries, dry_run, use_recycle_bin)
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(report)
}

// ---------------------------------------------------------------------------
// Large File Explorer
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn scan_large_files(
    min_size_mb: u64,
    app: AppHandle,
) -> Result<Vec<large_files::LargeEntry>, String> {
    let min_bytes = min_size_mb * 1024 * 1024;
    let roots = dev_artifacts::default_scan_roots();

    let entries = tauri::async_runtime::spawn_blocking(move || {
        large_files::scan_large_files(&roots, min_bytes, 500, |scanned_count, found_count| {
            let _ = app.emit(
                "large-scan-progress",
                LargeScanProgressPayload { scanned_count, found_count },
            );
        })
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(entries)
}

#[tauri::command]
pub async fn delete_large_entries(
    paths: Vec<String>,
    dry_run: bool,
    use_recycle_bin: bool,
) -> Result<cleaner::CleanReport, String> {
    let path_bufs: Vec<std::path::PathBuf> = paths.iter().map(std::path::PathBuf::from).collect();

    let report = tauri::async_runtime::spawn_blocking(move || {
        cleaner::delete_paths(&path_bufs, dry_run, use_recycle_bin)
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(report)
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_clean_history(state: State<'_, AppState>) -> Vec<HistoryEntry> {
    state.history.all()
}

#[tauri::command]
pub fn get_history_stats(state: State<'_, AppState>) -> serde_json::Value {
    serde_json::json!({
        "total_freed_bytes": state.history.total_freed(),
        "session_count": state.history.session_count(),
    })
}

#[tauri::command]
pub fn record_clean_session(
    freed_bytes: u64,
    deleted_count: usize,
    skipped_count: usize,
    label: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state
        .history
        .record(freed_bytes, deleted_count, skipped_count, &label)
        .map_err(|e| e.to_string())
}
