use cleaner_core::analyzer::{format_bytes, AnalysisReport};
use cleaner_core::categories::get_category;

pub fn print_report(report: &AnalysisReport) {
    println!(
        "{:<25} {:>8} {:>12}",
        "Category", "Files", "Size"
    );
    println!("{}", "-".repeat(48));

    for cat in &report.categories {
        if cat.file_count == 0 {
            continue;
        }
        let name = get_category(cat.category_id)
            .map(|c| c.name)
            .unwrap_or(cat.category_id);

        println!(
            "{:<25} {:>8} {:>12}",
            name,
            cat.file_count,
            format_bytes(cat.total_bytes)
        );
    }

    println!("{}", "-".repeat(48));
    println!(
        "{:<25} {:>8} {:>12}",
        "TOTAL",
        report.grand_total_files,
        format_bytes(report.grand_total_bytes)
    );
}
