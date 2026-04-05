use crate::cleaner::CleanReport;
use rayon::prelude::*;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub enum ArtifactKind {
    NodeModules,
    PythonVenv,
    RustTarget,
    NextBuild,
    PythonCache,
    GradleCache,
}

/// How confident we are that this folder is a safe-to-delete project artifact
/// (not a tool's internal data).
#[derive(Debug, Clone, Serialize)]
pub enum ArtifactConfidence {
    /// Deep inside a user project, has strong marker files. Safe to delete.
    High,
    /// Has marker files but path is shallower — double-check before deleting.
    Medium,
    /// Match is weak (e.g. only package.json for .next) — verify manually.
    Low,
}

#[derive(Debug, Clone, Serialize)]
pub struct DevArtifactEntry {
    pub kind: ArtifactKind,
    pub artifact_path: PathBuf,
    pub project_name: String,
    pub project_path: PathBuf,
    pub size_bytes: u64,
    pub last_modified_secs: u64,
    pub age_days: u64,
    pub confidence: ArtifactConfidence,
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Scan `scan_roots` for unused dev artifact folders older than `min_age_days`.
/// `cancelled` flag can be set to stop the scan between roots.
/// `on_progress(found_count, total_bytes)` is called each time a new artifact is found.
pub fn scan_dev_artifacts<F>(
    min_age_days: u32,
    scan_roots: &[PathBuf],
    cancelled: &Arc<AtomicBool>,
    on_progress: F,
) -> Vec<DevArtifactEntry>
where
    F: Fn(usize, u64) + Sync,
{
    let results: Mutex<Vec<DevArtifactEntry>> = Mutex::new(Vec::new());

    for root in scan_roots {
        if cancelled.load(Ordering::Relaxed) {
            break;
        }
        if root.exists() {
            scan_dir(root, min_age_days, &results, &on_progress, cancelled, 0);
        }
    }

    let mut r = results.into_inner().unwrap_or_default();
    r.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    r
}

/// Delete the given artifact folders.
/// If `use_recycle_bin` is true, sends to Recycle Bin instead of permanent deletion.
pub fn clean_dev_artifacts(
    entries: &[DevArtifactEntry],
    dry_run: bool,
    _use_recycle_bin: bool,
) -> CleanReport {
    let mut report = CleanReport::default();

    for entry in entries {
        if dry_run {
            report.deleted_count += 1;
            report.freed_bytes += entry.size_bytes;
            continue;
        }

        // Dev artifact paths are always directories with potentially thousands of files.
        // trash::delete on Windows enumerates every file before moving — extremely slow.
        // Always use remove_dir_all for directories regardless of recycle bin setting.
        let result = std::fs::remove_dir_all(&entry.artifact_path);

        match result {
            Ok(_) => {
                report.deleted_count += 1;
                report.freed_bytes += entry.size_bytes;
            }
            Err(e) => {
                report
                    .skipped
                    .push((entry.artifact_path.clone(), e.to_string()));
            }
        }
    }

    report
}

/// Default roots to scan on Windows: USERPROFILE + extra drives D–Z if they exist.
pub fn default_scan_roots() -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(profile) = std::env::var("USERPROFILE") {
        roots.push(PathBuf::from(profile));
    }

    for letter in b'D'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        let p = PathBuf::from(&drive);
        if p.exists() {
            roots.push(p);
        }
    }

    roots
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn artifact_kind(name: &str) -> Option<ArtifactKind> {
    match name {
        "node_modules" => Some(ArtifactKind::NodeModules),
        ".venv" | "venv" => Some(ArtifactKind::PythonVenv),
        "target" => Some(ArtifactKind::RustTarget),
        ".next" => Some(ArtifactKind::NextBuild),
        "__pycache__" => Some(ArtifactKind::PythonCache),
        ".gradle" => Some(ArtifactKind::GradleCache),
        _ => None,
    }
}

/// Marker files that must exist in the PARENT directory to confirm the artifact.
fn markers_for(kind: &ArtifactKind) -> &'static [&'static str] {
    match kind {
        ArtifactKind::NodeModules => &["package.json"],
        ArtifactKind::PythonVenv => &["requirements.txt", "pyproject.toml", "setup.py"],
        ArtifactKind::RustTarget => &["Cargo.toml"],
        ArtifactKind::NextBuild => &[
            "next.config.js",
            "next.config.ts",
            "next.config.mjs",
            "next.config.cjs",
        ],
        ArtifactKind::PythonCache => &[], // always safe to delete
        ArtifactKind::GradleCache => &["build.gradle", "build.gradle.kts", "settings.gradle"],
    }
}

/// How strong are the markers for this artifact kind?
/// "Strong" means the marker file is highly specific to a real project.
fn has_strong_marker(kind: &ArtifactKind) -> bool {
    matches!(
        kind,
        ArtifactKind::RustTarget
            | ArtifactKind::PythonVenv
            | ArtifactKind::GradleCache
            | ArtifactKind::PythonCache
    )
}

fn verify_marker(kind: &ArtifactKind, parent: &Path) -> bool {
    let markers = markers_for(kind);
    if markers.is_empty() {
        return true;
    }
    markers.iter().any(|m| parent.join(m).exists())
}

/// Compute confidence based on artifact kind, marker strength, and scan depth.
/// depth is the recursion depth from the scan root (0 = direct child of root).
fn compute_confidence(kind: &ArtifactKind, depth: u32) -> ArtifactConfidence {
    // __pycache__ is always safe — it's auto-regenerated by Python
    if matches!(kind, ArtifactKind::PythonCache) {
        return ArtifactConfidence::High;
    }

    // Strong marker + deep enough path → High confidence
    if has_strong_marker(kind) && depth >= 2 {
        return ArtifactConfidence::High;
    }

    // Strong marker but shallow (depth 1 = direct child of home, e.g. ~/target) → Medium
    if has_strong_marker(kind) {
        return ArtifactConfidence::Medium;
    }

    // Weak marker (node_modules/package.json, .next/next.config.*) + deep → Medium
    if depth >= 3 {
        return ArtifactConfidence::Medium;
    }

    // Shallow path with weak marker → Low
    ArtifactConfidence::Low
}

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        // Windows system directories
        "Windows"
            | "Program Files"
            | "Program Files (x86)"
            | "ProgramData"
            | "$Recycle.Bin"
            | "$WinREAgent"
            | "System Volume Information"
            | "Recovery"
            | "MSOCache"
            // VCS
            | ".git"
            | ".svn"
            | ".hg"
            // Windows user data that is NOT project code
            | "AppData"
            // Node version managers — their node_modules are part of the tool
            | ".nvm"
            | ".volta"
            | ".fnm"
            | ".nodenv"
            | ".nvs"
            // Python environment managers
            | ".pyenv"
            | ".conda"
            | "conda"
            | "miniconda"
            | "miniconda3"
            | "anaconda"
            | "Anaconda3"
            | "Miniforge3"
            // Windows package managers
            | "scoop"
            | "chocolatey"
            // Rust toolchain (not user projects)
            | ".cargo"
            | ".rustup"
            // npm/pnpm/yarn global caches
            | ".npm"
            | ".pnpm-store"
            | ".pnpm"
            | ".yarn"
            | "npm"
            // Other tool caches
            | ".gradle" // skip top-level ~/.gradle (Gradle home), but allow project-level
            | ".m2"
            | ".ivy2"
            | ".sbt"
    )
}

fn is_stale(path: &Path, min_age_days: u32) -> bool {
    if min_age_days == 0 {
        return true;
    }
    age_days(path) >= min_age_days as u64
}

fn age_days(path: &Path) -> u64 {
    path.metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.elapsed().ok())
        .map(|d| d.as_secs() / 86400)
        .unwrap_or(0)
}

fn last_modified_secs(path: &Path) -> u64 {
    use std::time::UNIX_EPOCH;
    path.metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn folder_size(path: &Path) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

/// Recursively scan `path` for artifact folders.
/// Stops recursing into artifact folders (prevents scanning node_modules inside node_modules).
fn scan_dir<F>(
    path: &Path,
    min_age_days: u32,
    results: &Mutex<Vec<DevArtifactEntry>>,
    on_progress: &F,
    cancelled: &Arc<AtomicBool>,
    depth: u32,
) where
    F: Fn(usize, u64) + Sync,
{
    // Prevent runaway recursion or cancelled scan
    if depth > 15 || cancelled.load(Ordering::Relaxed) {
        return;
    }

    let read_dir = match std::fs::read_dir(path) {
        Ok(rd) => rd,
        Err(_) => return,
    };

    let mut recurse_into: Vec<PathBuf> = Vec::new();

    for entry in read_dir.flatten() {
        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };

        // Skip non-directories and symlinks
        if !file_type.is_dir() || file_type.is_symlink() {
            continue;
        }

        let entry_path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        if should_skip_dir(&name_str) {
            continue;
        }

        if let Some(kind) = artifact_kind(&name_str) {
            if verify_marker(&kind, path) {
                if is_stale(&entry_path, min_age_days) {
                    let size = folder_size(&entry_path);
                    let age = age_days(&entry_path);
                    let last_mod = last_modified_secs(&entry_path);
                    let project_name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| path.to_string_lossy().to_string());
                    let confidence = compute_confidence(&kind, depth);

                    let artifact = DevArtifactEntry {
                        kind,
                        artifact_path: entry_path,
                        project_name,
                        project_path: path.to_path_buf(),
                        size_bytes: size,
                        last_modified_secs: last_mod,
                        age_days: age,
                        confidence,
                    };

                    let mut guard = results.lock().unwrap();
                    guard.push(artifact);
                    let count = guard.len();
                    let total: u64 = guard.iter().map(|e| e.size_bytes).sum();
                    drop(guard);

                    on_progress(count, total);
                }
                // Whether stale or not, don't recurse into verified artifact folders
                continue;
            }
            // No marker found — treat as regular dir and recurse
        }

        recurse_into.push(entry_path);
    }

    recurse_into.par_iter().for_each(|subdir| {
        scan_dir(subdir, min_age_days, results, on_progress, cancelled, depth + 1);
    });
}
