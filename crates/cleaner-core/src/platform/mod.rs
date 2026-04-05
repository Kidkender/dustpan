use std::path::PathBuf;

#[cfg(windows)]
mod windows;

#[cfg(not(windows))]
mod stub;

pub fn scan_paths_for(category_id: &str) -> Vec<PathBuf> {
    #[cfg(windows)]
    return windows::scan_paths_for(category_id);

    #[cfg(not(windows))]
    return stub::scan_paths_for(category_id);
}

pub fn is_elevated() -> bool {
    #[cfg(windows)]
    return windows::is_elevated();

    #[cfg(not(windows))]
    return false;
}
