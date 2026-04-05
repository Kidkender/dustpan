use crate::scanner::ScannedFile;
use std::path::PathBuf;

#[derive(Debug, Default, serde::Serialize)]
pub struct CleanReport {
    pub deleted_count: usize,
    pub freed_bytes: u64,
    pub skipped: Vec<(PathBuf, String)>,
}

fn delete_path(path: &std::path::Path, use_recycle_bin: bool) -> std::io::Result<()> {
    if use_recycle_bin {
        trash::delete(path).map_err(|e| std::io::Error::other(e.to_string()))
    } else {
        std::fs::remove_file(path)
    }
}

/// Delete the given files with progress callback.
/// If `use_recycle_bin` is true, sends to Recycle Bin instead of permanent deletion.
pub fn clean_with_callback<F>(
    files: &[ScannedFile],
    dry_run: bool,
    use_recycle_bin: bool,
    mut on_progress: F,
) -> CleanReport
where
    F: FnMut(usize, u64),
{
    let mut report = CleanReport::default();

    for file in files {
        if dry_run {
            report.deleted_count += 1;
            report.freed_bytes += file.size_bytes;
        } else {
            match delete_path(&file.path, use_recycle_bin) {
                Ok(_) => {
                    report.deleted_count += 1;
                    report.freed_bytes += file.size_bytes;
                }
                Err(e) => {
                    report.skipped.push((file.path.clone(), e.to_string()));
                }
            }
        }
        on_progress(report.deleted_count, report.freed_bytes);
    }

    report
}

/// Delete a list of arbitrary paths (files or directories).
/// Used by Large File Explorer delete.
pub fn delete_paths(paths: &[PathBuf], dry_run: bool, use_recycle_bin: bool) -> CleanReport {
    let mut report = CleanReport::default();

    for path in paths {
        if dry_run {
            let size = path_size(path);
            report.deleted_count += 1;
            report.freed_bytes += size;
            continue;
        }

        let size = path_size(path);

        // For directories: always use remove_dir_all — trash::delete on Windows
        // enumerates every file in the tree before moving, which is prohibitively
        // slow for large directories (e.g. node_modules, .venv with 50k+ files).
        let result = if path.is_dir() {
            std::fs::remove_dir_all(path)
        } else if use_recycle_bin {
            trash::delete(path).map_err(|e| std::io::Error::other(e.to_string()))
        } else {
            std::fs::remove_file(path)
        };

        match result {
            Ok(_) => {
                report.deleted_count += 1;
                report.freed_bytes += size;
            }
            Err(e) => {
                report.skipped.push((path.clone(), e.to_string()));
            }
        }
    }

    report
}

fn path_size(path: &std::path::Path) -> u64 {
    if path.is_file() {
        path.metadata().map(|m| m.len()).unwrap_or(0)
    } else {
        walkdir::WalkDir::new(path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .filter_map(|e| e.metadata().ok())
            .map(|m| m.len())
            .sum()
    }
}
