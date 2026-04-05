use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    /// Categories enabled by default
    pub enabled_categories: Vec<String>,
    /// Minimum file age in days before it's considered junk (0 = no filter)
    pub min_age_days: u32,
    /// Extra paths to scan (user-defined)
    pub custom_paths: Vec<PathBuf>,
    /// Paths to never touch
    pub exclude_paths: Vec<PathBuf>,
    /// Send deleted files to Recycle Bin instead of permanent deletion
    #[serde(default = "default_true")]
    pub use_recycle_bin: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            enabled_categories: vec![
                "user_temp".into(),
                "browser_chrome".into(),
                "browser_edge".into(),
                "browser_firefox".into(),
                "thumbnail_cache".into(),
                "crash_dumps".into(),
            ],
            min_age_days: 0,
            custom_paths: vec![],
            exclude_paths: vec![],
            use_recycle_bin: true,
        }
    }
}

fn default_true() -> bool {
    true
}

pub fn config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|p| p.join("cleaner-app").join("config.toml"))
}

pub fn save(config: &Config) -> crate::error::Result<()> {
    let path = config_path()
        .ok_or_else(|| crate::error::CleanerError::Config("Cannot resolve config dir".into()))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let toml = toml::to_string_pretty(config)
        .map_err(|e| crate::error::CleanerError::Config(e.to_string()))?;
    std::fs::write(&path, toml)?;
    Ok(())
}

pub fn load() -> Config {
    let path = match config_path() {
        Some(p) => p,
        None => return Config::default(),
    };

    let Ok(contents) = std::fs::read_to_string(&path) else {
        return Config::default();
    };

    toml::from_str(&contents).unwrap_or_default()
}
