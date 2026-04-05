import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "@/lib/utils";
import { Clock, Trash2, CheckCircle2 } from "lucide-react";
import * as api from "@/lib/api";
import type { HistoryEntry, HistoryStats } from "@/types";

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BarChart({ entries }: { entries: HistoryEntry[] }) {
  // Show last 12 sessions as bars
  const data = useMemo(() => {
    const recent = [...entries].slice(0, 12).reverse();
    const max = Math.max(...recent.map((e) => e.freed_bytes), 1);
    return recent.map((e) => ({
      label: new Date(e.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: e.freed_bytes,
      pct: (e.freed_bytes / max) * 100,
    }));
  }, [entries]);

  if (data.length === 0) return null;

  return (
    <div className="flex items-end gap-1.5 h-24 px-1">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t bg-primary/60 hover:bg-primary transition-colors"
            style={{ height: `${Math.max(d.pct, 4)}%` }}
            title={`${d.label}: ${formatBytes(d.value)}`}
          />
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getCleanHistory(), api.getHistoryStats()])
      .then(([h, s]) => {
        setEntries(h);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Loading history...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-muted-foreground">
        <Clock className="w-10 h-10 opacity-20" />
        <p className="text-sm">No clean sessions yet. Run your first scan to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">Clean History</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your PC cleaning activity over time
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats summary */}
        {stats && (
          <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b border-border">
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-2xl font-bold text-primary">
                {formatBytes(stats.total_freed_bytes)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Total freed</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-2xl font-bold text-foreground">
                {stats.session_count}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Clean sessions</p>
            </div>
          </div>
        )}

        {/* Bar chart */}
        {entries.length > 1 && (
          <div className="px-6 py-4 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Space freed per session
            </p>
            <BarChart entries={entries} />
          </div>
        )}

        {/* Session list */}
        <div className="px-6 py-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Session Log
          </p>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 rounded-lg border border-border bg-card/50 px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{entry.label}</span>
                  <span className="text-sm font-bold text-primary shrink-0">
                    {formatBytes(entry.freed_bytes)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(entry.timestamp)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.deleted_count.toLocaleString()} deleted
                  </span>
                  {entry.skipped_count > 0 && (
                    <span className="text-xs text-yellow-500 flex items-center gap-1">
                      <Trash2 className="w-2.5 h-2.5" />
                      {entry.skipped_count} skipped
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
