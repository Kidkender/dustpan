use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JunkCategory {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub risk: RiskLevel,
    pub requires_admin: bool,
}

pub const ALL_CATEGORIES: &[JunkCategory] = &[
    JunkCategory {
        id: "user_temp",
        name: "User Temp Files",
        description: "Temporary files in %TEMP% and %LOCALAPPDATA%\\Temp",
        risk: RiskLevel::Low,
        requires_admin: false,
    },
    JunkCategory {
        id: "system_temp",
        name: "System Temp Files",
        description: "Temporary files in C:\\Windows\\Temp",
        risk: RiskLevel::Low,
        requires_admin: true,
    },
    JunkCategory {
        id: "browser_chrome",
        name: "Chrome Cache",
        description: "Google Chrome browser cache files",
        risk: RiskLevel::Low,
        requires_admin: false,
    },
    JunkCategory {
        id: "browser_edge",
        name: "Edge Cache",
        description: "Microsoft Edge browser cache files",
        risk: RiskLevel::Low,
        requires_admin: false,
    },
    JunkCategory {
        id: "browser_firefox",
        name: "Firefox Cache",
        description: "Mozilla Firefox browser cache files",
        risk: RiskLevel::Low,
        requires_admin: false,
    },
    JunkCategory {
        id: "thumbnail_cache",
        name: "Thumbnail Cache",
        description: "Windows Explorer thumbnail cache files",
        risk: RiskLevel::Low,
        requires_admin: false,
    },
    JunkCategory {
        id: "crash_dumps",
        name: "Crash Dumps",
        description: "Application crash dump files",
        risk: RiskLevel::Low,
        requires_admin: false,
    },
    JunkCategory {
        id: "windows_update",
        name: "Windows Update Cache",
        description: "Downloaded Windows Update files (safe to remove after updates are applied)",
        risk: RiskLevel::Medium,
        requires_admin: true,
    },
    JunkCategory {
        id: "prefetch",
        name: "Prefetch Files",
        description: "Windows prefetch files (Windows will rebuild these)",
        risk: RiskLevel::Medium,
        requires_admin: true,
    },
    JunkCategory {
        id: "log_files",
        name: "Log Files",
        description: "Windows system log files",
        risk: RiskLevel::Medium,
        requires_admin: true,
    },
];

pub fn get_category(id: &str) -> Option<&'static JunkCategory> {
    ALL_CATEGORIES.iter().find(|c| c.id == id)
}

/// Returns the filesystem paths to scan for a given category ID.
/// Resolves environment variables via the platform module.
pub fn scan_paths_for(id: &str) -> Vec<PathBuf> {
    crate::platform::scan_paths_for(id)
}
