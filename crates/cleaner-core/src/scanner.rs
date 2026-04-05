use crate::categories::{scan_paths_for, ALL_CATEGORIES};
use rayon::prelude::*;
use std::path::PathBuf;
use walkdir::WalkDir;

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScannedFile {
    pub path: PathBuf,
    pub size_bytes: u64,
    pub category_id: &'static str,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ScanResult {
    pub category_id: &'static str,
    pub files: Vec<ScannedFile>,
    pub total_bytes: u64,
    pub errors: Vec<String>,
}

pub fn scan_categories(category_ids: &[&str]) -> Vec<ScanResult> {
    category_ids
        .par_iter()
        .map(|&id| scan_category_by_id(id))
        .collect()
}

pub fn scan_all() -> Vec<ScanResult> {
    let ids: Vec<&str> = ALL_CATEGORIES.iter().map(|c| c.id).collect();
    scan_categories(&ids)
}

/// Look up the `&'static str` id from ALL_CATEGORIES and scan it.
/// Returns a result with an error entry if the id is not recognised.
pub fn scan_category_by_id(id: &str) -> ScanResult {
    match ALL_CATEGORIES.iter().find(|c| c.id == id) {
        Some(cat) => scan_category(cat.id),
        None => ScanResult {
            category_id: "unknown",
            files: vec![],
            total_bytes: 0,
            errors: vec![format!("Unknown category: {id}")],
        },
    }
}

fn scan_category(category_id: &'static str) -> ScanResult {
    let paths = scan_paths_for(category_id);
    let mut files = vec![];
    let mut errors = vec![];

    for base_path in paths {
        if !base_path.exists() {
            continue;
        }

        // If it's a single file (e.g. thumbcache_*.db), add directly
        if base_path.is_file() {
            match base_path.metadata() {
                Ok(meta) => files.push(ScannedFile {
                    path: base_path,
                    size_bytes: meta.len(),
                    category_id,
                }),
                Err(e) => errors.push(format!("{}: {}", base_path.display(), e)),
            }
            continue;
        }

        for entry in WalkDir::new(&base_path)
            .min_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            match entry.metadata() {
                Ok(meta) => files.push(ScannedFile {
                    path: entry.into_path(),
                    size_bytes: meta.len(),
                    category_id,
                }),
                Err(e) => errors.push(format!("{e}")),
            }
        }
    }

    let total_bytes = files.iter().map(|f| f.size_bytes).sum();

    ScanResult {
        category_id,
        files,
        total_bytes,
        errors,
    }
}
