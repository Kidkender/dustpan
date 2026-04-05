use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "cleaner-app")]
#[command(about = "A fast, safe PC junk cleaner", long_about = None)]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Scan for junk files and show what can be cleaned (no deletion)
    Scan {
        /// Only scan specific categories (e.g. user_temp browser_chrome)
        #[arg(short, long, num_args = 1..)]
        category: Option<Vec<String>>,
    },

    /// Scan and delete junk files (asks for confirmation by default)
    Clean {
        /// Only clean specific categories
        #[arg(short, long, num_args = 1..)]
        category: Option<Vec<String>>,

        /// Simulate cleaning without deleting anything
        #[arg(long, default_value_t = false)]
        dry_run: bool,

        /// Skip confirmation prompt (for scripting)
        #[arg(short, long, default_value_t = false)]
        force: bool,
    },
}
