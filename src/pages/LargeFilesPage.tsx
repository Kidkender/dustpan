import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Trash2, FolderOpen, Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useLargeScanProgress } from "@/hooks/useLargeScanProgress";
import * as api from "@/lib/api";
import type { LargeEntry, FileRisk } from "@/types";

interface LargeFilesPageProps {
  useRecycleBin: boolean;
}

const riskConfig: Record<FileRisk, { label: string; className: string; icon: React.ReactNode; tooltip: string }> = {
  Safe: {
    label: "Safe",
    className: "bg-transparent text-muted-foreground border-muted",
    icon: null,
    tooltip: "Common media, document, or archive file. Generally safe to delete.",
  },
  AppData: {
    label: "App Data",
    className: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
    icon: <AlertTriangle className="w-2.5 h-2.5 mr-1" />,
    tooltip: "Application database or config file. Deleting may cause app data loss or corruption.",
  },
  System: {
    label: "System",
    className: "bg-red-900/40 text-red-300 border-red-800",
    icon: <ShieldAlert className="w-2.5 h-2.5 mr-1" />,
    tooltip: "Executable, DLL, system driver, or disk image. Deleting may break installed software or Windows.",
  },
};

export function LargeFilesPage({ useRecycleBin }: LargeFilesPageProps) {
  const [minSizeMb, setMinSizeMb] = useState(50);
  const [entries, setEntries] = useState<LargeEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletedPaths, setDeletedPaths] = useState<Set<string>>(new Set());
  const progress = useLargeScanProgress();

  const handleScan = async () => {
    setScanning(true);
    setEntries([]);
    setSelected(new Set());
    setDeletedPaths(new Set());
    try {
      const results = await api.scanLargeFiles(minSizeMb);
      setEntries(results);
    } finally {
      setScanning(false);
    }
  };

  const toggle = (path: string, risk: FileRisk) => {
    if (risk === "System") return; // never allow selecting System files
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const visibleEntries = entries.filter((e) => !deletedPaths.has(e.path));
  const selectableEntries = visibleEntries.filter((e) => e.risk !== "System");

  const allSelected = selectableEntries.length > 0 && selectableEntries.every((e) => selected.has(e.path));
  const someSelected = selectableEntries.some((e) => selected.has(e.path));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      // Only select Safe entries by default; AppData needs explicit opt-in
      setSelected(new Set(selectableEntries.filter((e) => e.risk === "Safe").map((e) => e.path)));
    }
  };

  const selectedEntries = visibleEntries.filter((e) => selected.has(e.path));
  const totalSelectedBytes = selectedEntries.reduce((s, e) => s + e.size_bytes, 0);
  const appDataSelectedCount = selectedEntries.filter((e) => e.risk === "AppData").length;

  const handleDelete = async () => {
    setConfirmOpen(false);
    const paths = Array.from(selected);
    try {
      const report = await api.deleteLargeEntries(paths, false, useRecycleBin);
      const skippedPaths = new Set(report.skipped.map(([p]) => p));
      const removed = new Set(paths.filter((p) => !skippedPaths.has(p)));
      setDeletedPaths((prev) => new Set([...prev, ...removed]));
      setSelected(new Set());
    } catch (e) {
      console.error(e);
    }
  };

  const openFolder = async (parent: string) => {
    try {
      const { Command } = await import("@tauri-apps/plugin-shell");
      await Command.create("explorer", [parent]).execute();
    } catch {
      // best-effort
    }
  };

  const systemCount = visibleEntries.filter((e) => e.risk === "System").length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">Large File Explorer</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Find the biggest files on your drives
        </p>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Min size:</span>
        <Input
          type="number"
          min={1}
          max={10000}
          value={minSizeMb}
          onChange={(e) => setMinSizeMb(Math.max(1, parseInt(e.target.value) || 1))}
          className="h-8 w-24 text-sm"
        />
        <span className="text-sm text-muted-foreground">MB</span>
        <Button onClick={handleScan} disabled={scanning} size="sm" className="gap-2">
          {scanning
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Search className="w-3.5 h-3.5" />
          }
          {scanning ? "Scanning..." : "Scan"}
        </Button>
        {selected.size > 0 && (
          <Button
            size="sm"
            variant="destructive"
            className="gap-2 ml-auto"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selected.size} ({formatBytes(totalSelectedBytes)})
          </Button>
        )}
      </div>

      {/* Scan progress */}
      {scanning && (
        <div className="px-6 py-3 border-b border-border space-y-1.5">
          <p className="text-xs text-muted-foreground">
            {progress
              ? `Scanned ${progress.scanned_count.toLocaleString()} files · ${progress.found_count} large files found`
              : "Starting scan..."}
          </p>
          <Progress className="h-1 animate-pulse" />
        </div>
      )}

      {/* System file warning */}
      {!scanning && systemCount > 0 && (
        <div className="mx-6 mt-3 flex items-start gap-2 px-3 py-2 rounded-md border border-red-800 bg-red-950/30 text-red-300 text-xs">
          <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <strong>{systemCount} system file{systemCount > 1 ? "s" : ""}</strong> detected (executables, DLLs, disk images).
            These are shown for reference only and <strong>cannot be selected</strong>.
            Deleting them may break installed software or Windows.
          </span>
        </div>
      )}

      {/* Results table */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {!scanning && visibleEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Search className="w-10 h-10 opacity-20" />
            <p className="text-sm">
              {entries.length === 0
                ? "Set a minimum size and click Scan to find large files"
                : "All selected files have been deleted"}
            </p>
          </div>
        )}

        {visibleEntries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected}
                    data-state={!allSelected && someSelected ? "indeterminate" : undefined}
                    onCheckedChange={toggleAll}
                    title="Select all safe files"
                  />
                </TableHead>
                <TableHead>File</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry) => {
                const risk = riskConfig[entry.risk];
                const isSystem = entry.risk === "System";
                const isSelected = selected.has(entry.path);

                return (
                  <TableRow
                    key={entry.path}
                    className={`${isSystem ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    onClick={() => toggle(entry.path, entry.risk)}
                    title={isSystem ? risk.tooltip : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        disabled={isSystem}
                        onCheckedChange={() => toggle(entry.path, entry.risk)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px]">
                      <span className="truncate block" title={entry.path}>
                        {entry.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 flex items-center w-fit ${risk.className}`}
                        title={risk.tooltip}
                      >
                        {risk.icon}
                        {risk.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span
                        className="text-xs text-muted-foreground font-mono truncate block"
                        title={entry.parent}
                      >
                        {entry.parent}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatBytes(entry.size_bytes)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        className="text-muted-foreground hover:text-foreground"
                        title="Open containing folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFolder(entry.parent);
                        }}
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer */}
      {visibleEntries.length > 0 && (
        <div className="px-6 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {visibleEntries.length} files · {formatBytes(visibleEntries.reduce((s, e) => s + e.size_bytes, 0))} total
          </span>
          <span>{selected.size} selected · {formatBytes(totalSelectedBytes)}</span>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} file{selected.size > 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {useRecycleBin
                    ? "Files will be moved to the Recycle Bin and can be restored."
                    : "This will permanently delete these files. This cannot be undone."}
                  {" "}Total: <strong className="text-foreground">{formatBytes(totalSelectedBytes)}</strong>.
                </p>
                {appDataSelectedCount > 0 && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-yellow-800 bg-yellow-950/30 text-yellow-300 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong>{appDataSelectedCount} App Data file{appDataSelectedCount > 1 ? "s" : ""}</strong> selected.
                      These may be databases or config files used by installed apps.
                      Deleting them could cause data loss in those apps.
                    </span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>
              {useRecycleBin ? "Send to Recycle Bin" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
