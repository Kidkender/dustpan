# Dustpan

A fast, safe Windows PC cleaner built with **Rust + Tauri + React**.

Scans for junk files, unused developer build artifacts, and large files — shows you exactly what it found, and deletes only what you approve.

---

## Features

### Junk File Cleaner
- Parallel scanning via Rayon — fast even on large cache directories
- Category-based control with Low / Medium / High risk levels
- Medium-risk categories (System Temp, Prefetch, Windows Update) require administrator elevation
- Dry-run mode to preview deletions before committing

### Developer Artifacts Scanner
- Detects unused `node_modules`, `.venv`, `target/`, `.next`, `__pycache__`, `.gradle`
- Verifies project marker files (`package.json`, `Cargo.toml`, etc.) to avoid false positives
- Skips tool directories: `.nvm`, `.volta`, `.cargo`, `AppData`, `scoop`, and more
- Confidence scoring (High / Medium / Low) — Low confidence items not auto-selected

### Large File Explorer
- Find the biggest files across all drives above a configurable size threshold
- File risk classification: **Safe**, **App Data**, **System**
- System files (`.exe`, `.dll`, `.sys`, `.vhd`, `.vmdk`, `.iso`) are shown but cannot be deleted
- App Data files flagged with warning before deletion

### Safety First
- **Recycle Bin mode on by default** — all deletions go to Recycle Bin and can be restored
- Confirm dialog before every deletion with full size breakdown
- `AppData` directory skipped during all drive scans
- No registry writes, no background services, no telemetry

### Clean History
- Every clean session recorded in a local SQLite database
- Dashboard shows total space freed, session count, and per-session bar chart

### Settings
- Persistent TOML config at `%APPDATA%\cleaner-app\config.toml`
- Toggle categories, set minimum file age, add custom/exclude paths
- Switch between Recycle Bin and permanent deletion

---

## Installation

### Option A — Download installer

Grab the latest `.msi` or `.exe` installer from the [Releases](../../releases) page.

### Option B — Build from source

**Prerequisites:**
- [Rust toolchain](https://rustup.rs/) with MSVC target (`x86_64-pc-windows-msvc`)
- [Node.js](https://nodejs.org/) 18+ and [pnpm](https://pnpm.io/)
- Visual Studio Build Tools (C++ workload)

```bash
git clone https://github.com/kidkender/dustpan
cd dustpan
pnpm install
pnpm tauri build
```

The installer is output to:
```
target/release/bundle/msi/Dustpan_x.x.x_x64_en-US.msi
target/release/bundle/nsis/Dustpan_x.x.x_x64-setup.exe
```

---

## Development

```bash
pnpm install          # install frontend dependencies
pnpm tauri dev        # start dev server with hot reload

cargo build           # build Rust workspace
cargo test            # run all tests
cargo clippy          # lint
```

---

## Project Structure

```
dustpan/
├── crates/
│   ├── cleaner-core/       # Library: scanning, analysis, deletion, config
│   │   ├── src/
│   │   │   ├── categories.rs   # Junk category registry
│   │   │   ├── scanner.rs      # Parallel file scanner
│   │   │   ├── analyzer.rs     # Aggregation and reporting
│   │   │   ├── cleaner.rs      # Deletion with Recycle Bin support
│   │   │   ├── dev_artifacts.rs # Dev artifact detection
│   │   │   ├── large_files.rs  # Large file scanner with risk scoring
│   │   │   ├── config.rs       # TOML config load/save
│   │   │   └── platform/       # Windows-specific paths and elevation
│   └── cleaner-cli/        # (legacy) CLI interface
├── src/                    # React frontend
│   ├── pages/
│   │   ├── HomePage.tsx        # Category selection + dev artifacts toggle
│   │   ├── ScanningPage.tsx    # Live scan progress
│   │   ├── ResultsPage.tsx     # Scan results with filter/sort
│   │   ├── CleaningPage.tsx    # Deletion progress
│   │   ├── DonePage.tsx        # Clean report
│   │   ├── LargeFilesPage.tsx  # Large file explorer
│   │   ├── HistoryPage.tsx     # Clean history dashboard
│   │   └── SettingsPage.tsx    # App settings
│   └── lib/
│       └── api.ts              # Tauri command wrappers
├── src-tauri/              # Tauri backend
│   └── src/
│       ├── commands.rs         # Tauri command handlers
│       ├── history.rs          # SQLite session history
│       └── state.rs            # App state
└── Cargo.toml              # Workspace root
```

---

## Junk Categories

| ID                | Name                  | Risk   | Admin Required |
|-------------------|-----------------------|--------|----------------|
| `user_temp`       | User Temp Files       | Low    | No             |
| `browser_chrome`  | Chrome Cache          | Low    | No             |
| `browser_edge`    | Edge Cache            | Low    | No             |
| `browser_firefox` | Firefox Cache         | Low    | No             |
| `thumbnail_cache` | Thumbnail Cache       | Low    | No             |
| `crash_dumps`     | Crash Dumps           | Low    | No             |
| `system_temp`     | System Temp Files     | Medium | Yes            |
| `windows_update`  | Windows Update Cache  | Medium | Yes            |
| `prefetch`        | Prefetch Files        | Medium | Yes            |
| `log_files`       | Log Files             | Medium | Yes            |

---

## Configuration

`%APPDATA%\cleaner-app\config.toml`

```toml
enabled_categories = [
    "user_temp",
    "browser_chrome",
    "browser_edge",
    "browser_firefox",
    "thumbnail_cache",
    "crash_dumps",
]

# Only delete files older than N days (0 = no filter)
min_age_days = 0

# Additional directories to include in junk scans
custom_paths = []

# Paths that will never be touched
exclude_paths = []

# Send to Recycle Bin instead of permanent deletion (recommended)
use_recycle_bin = true
```

---

## License

MIT — see [LICENSE](LICENSE)
