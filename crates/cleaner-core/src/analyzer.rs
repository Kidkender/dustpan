use crate::scanner::ScanResult;

#[derive(Debug, serde::Serialize)]
pub struct CategorySummary {
    pub category_id: &'static str,
    pub file_count: usize,
    pub total_bytes: u64,
}

#[derive(Debug, serde::Serialize)]
pub struct AnalysisReport {
    pub categories: Vec<CategorySummary>,
    pub grand_total_bytes: u64,
    pub grand_total_files: usize,
}

pub fn analyze(results: Vec<ScanResult>) -> AnalysisReport {
    let mut categories: Vec<CategorySummary> = results
        .into_iter()
        .map(|r| CategorySummary {
            category_id: r.category_id,
            file_count: r.files.len(),
            total_bytes: r.total_bytes,
        })
        .collect();

    // Sort by size descending
    categories.sort_by(|a, b| b.total_bytes.cmp(&a.total_bytes));

    let grand_total_bytes = categories.iter().map(|c| c.total_bytes).sum();
    let grand_total_files = categories.iter().map(|c| c.file_count).sum();

    AnalysisReport {
        categories,
        grand_total_bytes,
        grand_total_files,
    }
}

pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}
