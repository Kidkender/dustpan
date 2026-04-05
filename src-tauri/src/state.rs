use cleaner_core::dev_artifacts::DevArtifactEntry;
use cleaner_core::scanner::ScanResult;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use crate::history::HistoryDb;

pub struct AppState {
    pub scan_cache: Mutex<Option<Vec<ScanResult>>>,
    pub dev_artifact_cache: Mutex<Option<Vec<DevArtifactEntry>>>,
    pub scan_cancelled: Arc<AtomicBool>,
    pub history: HistoryDb,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            scan_cache: Mutex::new(None),
            dev_artifact_cache: Mutex::new(None),
            scan_cancelled: Arc::new(AtomicBool::new(false)),
            history: HistoryDb::open().expect("Failed to open history database"),
        }
    }
}
