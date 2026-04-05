use thiserror::Error;

#[derive(Debug, Error)]
pub enum CleanerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Category not found: {0}")]
    CategoryNotFound(String),

    #[error("Config error: {0}")]
    Config(String),
}

pub type Result<T> = std::result::Result<T, CleanerError>;
