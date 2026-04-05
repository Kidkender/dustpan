use rayon::prelude::*;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

/// Risk level for a large file based on its extension and location.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub enum FileRisk {
    /// Safe to delete — media, archives, logs, etc.
    Safe,
    /// Application data — could break an app if deleted.
    AppData,
    /// Executable / system file — deleting may break OS or installed software.
    System,
}

#[derive(Debug, Clone, Serialize)]
pub struct LargeEntry {
    pub path: PathBuf,
    pub name: String,
    pub parent: PathBuf,
    pub size_bytes: u64,
    pub modified_secs: u64,
    pub risk: FileRisk,
}

/// Scan `roots` for files larger than `min_size_bytes`.
/// Returns results sorted by size descending, capped at `limit`.
/// `on_progress(scanned_count, found_count)` emitted every 500 files.
pub fn scan_large_files<F>(
    roots: &[PathBuf],
    min_size_bytes: u64,
    limit: usize,
    on_progress: F,
) -> Vec<LargeEntry>
where
    F: Fn(u64, usize) + Sync,
{
    let results: Mutex<Vec<LargeEntry>> = Mutex::new(Vec::new());
    let scanned: Mutex<u64> = Mutex::new(0);

    roots.par_iter().for_each(|root| {
        if !root.exists() {
            return;
        }
        scan_root(root, min_size_bytes, &results, &scanned, &on_progress);
    });

    let mut r = results.into_inner().unwrap_or_default();
    r.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    r.truncate(limit);
    r
}

fn scan_root<F>(
    root: &Path,
    min_size_bytes: u64,
    results: &Mutex<Vec<LargeEntry>>,
    scanned: &Mutex<u64>,
    on_progress: &F,
) where
    F: Fn(u64, usize) + Sync,
{
    let walker = walkdir::WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| !should_skip_dir(e.file_name().to_string_lossy().as_ref()));

    for entry in walker.filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }

        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let size = meta.len();

        let mut count = scanned.lock().unwrap();
        *count += 1;
        let count_val = *count;
        drop(count);

        if count_val % 500 == 0 {
            let found = results.lock().unwrap().len();
            on_progress(count_val, found);
        }

        if size < min_size_bytes {
            continue;
        }

        let path = entry.path().to_path_buf();
        let name = entry.file_name().to_string_lossy().to_string();
        let parent = path.parent().unwrap_or(root).to_path_buf();
        let modified_secs = meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let risk = classify_risk(&path, &name);

        results.lock().unwrap().push(LargeEntry {
            path,
            name,
            parent,
            size_bytes: size,
            modified_secs,
            risk,
        });
    }
}

/// Classify a file's deletion risk based on extension and path.
fn classify_risk(path: &Path, name: &str) -> FileRisk {
    let ext = name
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_lowercase();

    // System / executable files — OS or installed software may depend on these
    if matches!(
        ext.as_str(),
        "exe" | "dll" | "sys" | "drv" | "ocx" | "cpl"
            | "msi" | "msix" | "appx"
            | "cat" | "inf" | "mui"
    ) {
        return FileRisk::System;
    }

    // Virtual machine / disk images — deleting destroys entire VMs or OS installs
    if matches!(
        ext.as_str(),
        "vhd" | "vhdx" | "vmdk" | "vdi" | "qcow2" | "img" | "iso"
    ) {
        return FileRisk::System;
    }

    // Application databases and config — could break apps or lose user data
    if matches!(
        ext.as_str(),
        "db" | "sqlite" | "sqlite3" | "mdf" | "ldf" | "accdb" | "mdb"
            | "pst" | "ost"  // Outlook mail databases
    ) {
        return FileRisk::AppData;
    }

    // Check if the path is inside a known application data directory
    let path_str = path.to_string_lossy().to_lowercase();
    if path_str.contains("appdata") || path_str.contains("application data") {
        return FileRisk::AppData;
    }

    FileRisk::Safe
}

/// Directories to skip entirely during scan.
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
            // Application data — contains live app databases, config, caches
            // Deleting files here can silently corrupt apps
            | "AppData"
            // VCS internals
            | ".git"
            | ".svn"
            | ".hg"
    )
}
