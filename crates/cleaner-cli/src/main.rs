mod cli;
mod display;

use clap::Parser;
use cli::{Cli, Commands};
use cleaner_core::{analyzer, categories, scanner};

fn main() {
    env_logger::init();
    let cli = Cli::parse();

    match cli.command {
        Commands::Scan { category } => {
            let ids: Vec<&str> = match &category {
                Some(ids) => ids.iter().map(String::as_str).collect(),
                None => categories::ALL_CATEGORIES.iter().map(|c| c.id).collect(),
            };

            println!("Scanning {} categories...\n", ids.len());
            let results = scanner::scan_categories(&ids);
            let report = analyzer::analyze(results);
            display::print_report(&report);
        }

        Commands::Clean { category, dry_run, force } => {
            let ids: Vec<&str> = match &category {
                Some(ids) => ids.iter().map(String::as_str).collect(),
                None => {
                    let config = cleaner_core::config::load();
                    // leak to get &'static str — acceptable for short-lived CLI
                    config
                        .enabled_categories
                        .into_iter()
                        .map(|s| Box::leak(s.into_boxed_str()) as &str)
                        .collect()
                }
            };

            println!("Scanning {} categories...\n", ids.len());
            let results = scanner::scan_categories(&ids);

            // Summarize before consuming results
            let total_files: usize = results.iter().map(|r| r.files.len()).sum();
            let total_bytes: u64 = results.iter().map(|r| r.total_bytes).sum();
            {
                // Borrow for display only
                let summaries: Vec<analyzer::CategorySummary> = results
                    .iter()
                    .map(|r| analyzer::CategorySummary {
                        category_id: r.category_id,
                        file_count: r.files.len(),
                        total_bytes: r.total_bytes,
                    })
                    .collect();
                let mut sorted = summaries;
                sorted.sort_by(|a, b| b.total_bytes.cmp(&a.total_bytes));
                let report = analyzer::AnalysisReport {
                    categories: sorted,
                    grand_total_bytes: total_bytes,
                    grand_total_files: total_files,
                };
                display::print_report(&report);
            }

            if total_files == 0 {
                println!("\nNothing to clean.");
                return;
            }

            if dry_run {
                println!("\n[DRY RUN] No files were deleted.");
                return;
            }

            if !force {
                print!(
                    "\nDelete {} files ({})? [y/N] ",
                    total_files,
                    analyzer::format_bytes(total_bytes)
                );
                use std::io::{self, BufRead, Write};
                io::stdout().flush().ok();
                let mut line = String::new();
                io::stdin().lock().read_line(&mut line).ok();
                if line.trim().to_lowercase() != "y" {
                    println!("Aborted.");
                    return;
                }
            }

            let all_files: Vec<_> = results.into_iter().flat_map(|r| r.files).collect();
            let clean_report = cleaner_core::cleaner::clean_with_callback(&all_files, false, false, |_, _| {});

            println!(
                "\nFreed {}. Deleted {} files. Skipped {}.",
                analyzer::format_bytes(clean_report.freed_bytes),
                clean_report.deleted_count,
                clean_report.skipped.len()
            );

            for (path, reason) in &clean_report.skipped {
                eprintln!("  SKIP {}: {}", path.display(), reason);
            }
        }
    }
}
