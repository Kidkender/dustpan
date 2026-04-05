# Changelog

All notable changes to Dustpan will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [0.1.0] — 2026-04-01

### Added
- **Junk File Cleaner** — parallel scan via Rayon across 10 built-in categories (User Temp, Chrome/Edge/Firefox Cache, Thumbnail Cache, Crash Dumps, System Temp, Windows Update Cache, Prefetch, Log Files)
- **Developer Artifacts Scanner** — detects unused `node_modules`, `.venv`, `target/`, `.next`, `__pycache__`, `.gradle` from projects not touched in N days
  - Confidence scoring (High / Medium / Low) based on marker files and path depth
  - Skips known tool directories: `.cargo`, `.nvm`, `.volta`, `AppData`, `scoop`, and more
  - Filter by artifact kind, sort by project / age / size
- **Large File Explorer** — find the biggest files across all drives above a configurable size threshold
  - File risk classification: Safe, App Data, System
  - System files (`.exe`, `.dll`, `.sys`, `.vhd`, `.vmdk`, `.iso`) shown but cannot be deleted
  - App Data files flagged with warning before deletion
- **Scan History Dashboard** — local SQLite database records every clean session
  - Total space freed, session count, per-session bar chart
- **Recycle Bin mode** — all deletions go to Recycle Bin by default; permanent delete is opt-in in Settings
- **Cancel scan** — cancel any in-progress scan without closing the app
- **Settings page** — persistent TOML config at `%APPDATA%\cleaner-app\config.toml`
  - Toggle categories, set minimum file age, switch deletion mode
- **Category risk levels** — Low (no elevation), Medium (admin required), reserved High tier
- **Admin elevation badge** — header shows current privilege level

[Unreleased]: https://github.com/kidkender/dustpan/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/kidkender/dustpan/releases/tag/v0.1.0
