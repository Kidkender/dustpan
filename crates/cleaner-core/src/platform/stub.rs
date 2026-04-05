// Non-Windows stub — paths not supported
use std::path::PathBuf;

pub fn scan_paths_for(_category_id: &str) -> Vec<PathBuf> {
    vec![]
}

pub fn is_elevated() -> bool {
    false
}
