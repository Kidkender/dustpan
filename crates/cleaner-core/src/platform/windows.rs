use std::path::PathBuf;

fn env(var: &str) -> Option<PathBuf> {
    std::env::var(var).ok().map(PathBuf::from)
}

pub fn scan_paths_for(category_id: &str) -> Vec<PathBuf> {
    match category_id {
        "user_temp" => {
            let mut paths = vec![];
            if let Some(p) = env("TEMP") {
                paths.push(p);
            }
            if let Some(p) = env("LOCALAPPDATA").map(|p| p.join("Temp")) {
                paths.push(p);
            }
            paths
        }
        "system_temp" => vec![PathBuf::from(r"C:\Windows\Temp")],
        "browser_chrome" => {
            let mut paths = vec![];
            if let Some(base) = env("LOCALAPPDATA") {
                paths.push(base.join(r"Google\Chrome\User Data\Default\Cache"));
                paths.push(base.join(r"Google\Chrome\User Data\Default\Code Cache"));
            }
            paths
        }
        "browser_edge" => {
            let mut paths = vec![];
            if let Some(base) = env("LOCALAPPDATA") {
                paths.push(base.join(r"Microsoft\Edge\User Data\Default\Cache"));
                paths.push(base.join(r"Microsoft\Edge\User Data\Default\Code Cache"));
            }
            paths
        }
        "browser_firefox" => {
            let mut paths = vec![];
            if let Some(base) = env("LOCALAPPDATA") {
                let profiles_dir = base.join(r"Mozilla\Firefox\Profiles");
                if let Ok(entries) = std::fs::read_dir(&profiles_dir) {
                    for entry in entries.flatten() {
                        let cache = entry.path().join("cache2");
                        if cache.exists() {
                            paths.push(cache);
                        }
                    }
                }
            }
            paths
        }
        "thumbnail_cache" => {
            let mut paths = vec![];
            if let Some(base) = env("LOCALAPPDATA") {
                let explorer = base.join(r"Microsoft\Windows\Explorer");
                if let Ok(entries) = std::fs::read_dir(&explorer) {
                    for entry in entries.flatten() {
                        let name = entry.file_name();
                        let name = name.to_string_lossy();
                        if name.starts_with("thumbcache_") && name.ends_with(".db") {
                            paths.push(entry.path());
                        }
                    }
                }
            }
            paths
        }
        "crash_dumps" => {
            let mut paths = vec![];
            if let Some(p) = env("LOCALAPPDATA").map(|p| p.join("CrashDumps")) {
                paths.push(p);
            }
            paths
        }
        "windows_update" => {
            vec![PathBuf::from(r"C:\Windows\SoftwareDistribution\Download")]
        }
        "prefetch" => vec![PathBuf::from(r"C:\Windows\Prefetch")],
        "log_files" => vec![
            PathBuf::from(r"C:\Windows\Logs"),
            PathBuf::from(r"C:\Windows\debug"),
        ],
        _ => vec![],
    }
}

pub fn is_elevated() -> bool {
    use windows::Win32::Foundation::HANDLE;
    use windows::Win32::Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY};
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut token = HANDLE::default();
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token).is_err() {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION::default();
        let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            Some(&mut elevation as *mut _ as *mut _),
            size,
            &mut size,
        );
        ok.is_ok() && elevation.TokenIsElevated != 0
    }
}
