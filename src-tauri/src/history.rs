use rusqlite::{Connection, Result, params};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize)]
pub struct HistoryEntry {
    pub id: i64,
    pub timestamp: i64,         // Unix seconds
    pub freed_bytes: u64,
    pub deleted_count: usize,
    pub skipped_count: usize,
    pub label: String,          // e.g. "Junk + Dev Artifacts"
}

pub struct HistoryDb {
    conn: Mutex<Connection>,
}

impl HistoryDb {
    pub fn open() -> Result<Self> {
        let path = db_path();
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        let conn = Connection::open(&path)?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS clean_history (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp     INTEGER NOT NULL,
                freed_bytes   INTEGER NOT NULL,
                deleted_count INTEGER NOT NULL,
                skipped_count INTEGER NOT NULL,
                label         TEXT NOT NULL
            );",
        )?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn record(
        &self,
        freed_bytes: u64,
        deleted_count: usize,
        skipped_count: usize,
        label: &str,
    ) -> Result<()> {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs() as i64)
            .unwrap_or(0);

        self.conn.lock().unwrap().execute(
            "INSERT INTO clean_history (timestamp, freed_bytes, deleted_count, skipped_count, label)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![timestamp, freed_bytes as i64, deleted_count as i64, skipped_count as i64, label],
        )?;
        Ok(())
    }

    pub fn all(&self) -> Vec<HistoryEntry> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = match conn.prepare(
            "SELECT id, timestamp, freed_bytes, deleted_count, skipped_count, label
             FROM clean_history ORDER BY timestamp DESC LIMIT 100",
        ) {
            Ok(s) => s,
            Err(_) => return vec![],
        };

        stmt.query_map([], |row| {
            Ok(HistoryEntry {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                freed_bytes: row.get::<_, i64>(2)? as u64,
                deleted_count: row.get::<_, i64>(3)? as usize,
                skipped_count: row.get::<_, i64>(4)? as usize,
                label: row.get(5)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn total_freed(&self) -> u64 {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            "SELECT COALESCE(SUM(freed_bytes), 0) FROM clean_history",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|v| v as u64)
        .unwrap_or(0)
    }

    pub fn session_count(&self) -> usize {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM clean_history", [], |row| {
            row.get::<_, i64>(0)
        })
        .map(|v| v as usize)
        .unwrap_or(0)
    }
}

fn db_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("cleaner-app")
        .join("history.db")
}
