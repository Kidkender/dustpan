import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, RotateCcw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import type {
  AnalysisReport,
  JunkCategory,
  DevArtifactEntry,
  ArtifactKind,
  ArtifactConfidence,
} from "@/types";

interface ResultsPageProps {
  report: AnalysisReport;
  categories: JunkCategory[];
  devArtifacts: DevArtifactEntry[];
  onClean: (categoryIds: string[], devArtifactPaths: string[]) => void;
  onScanAgain: () => void;
}

const artifactKindLabel: Record<ArtifactKind, string> = {
  NodeModules: "node_modules",
  PythonVenv: "Python venv",
  RustTarget: "Rust target",
  NextBuild: ".next build",
  PythonCache: "__pycache__",
  GradleCache: ".gradle",
};

const artifactKindColor: Record<ArtifactKind, string> = {
  NodeModules: "bg-green-900/50 text-green-300 border-green-800",
  PythonVenv: "bg-blue-900/50 text-blue-300 border-blue-800",
  RustTarget: "bg-orange-900/50 text-orange-300 border-orange-800",
  NextBuild: "bg-purple-900/50 text-purple-300 border-purple-800",
  PythonCache: "bg-sky-900/50 text-sky-300 border-sky-800",
  GradleCache: "bg-red-900/50 text-red-300 border-red-800",
};

const confidenceConfig: Record<
  ArtifactConfidence,
  { label: string; className: string; tooltip: string }
> = {
  High: {
    label: "High",
    className: "text-green-400",
    tooltip: "Strong marker files found, deep within project folder. Safe to delete.",
  },
  Medium: {
    label: "Medium",
    className: "text-yellow-400",
    tooltip: "Marker files found but path is shallow. Double-check before deleting.",
  },
  Low: {
    label: "Low",
    className: "text-red-400",
    tooltip: "Weak marker or shallow path. May be a tool or CLI folder. Verify manually before deleting.",
  },
};

type SortKey = "size" | "age" | "name";
type SortDir = "asc" | "desc";

export function ResultsPage({ report, categories, devArtifacts, onClean, onScanAgain }: ResultsPageProps) {
  const junkCats = report.categories.filter((c) => c.file_count > 0);

  const [selected, setSelected] = useState<Set<string>>(
    new Set(junkCats.map((c) => c.category_id))
  );
  const [selectedDev, setSelectedDev] = useState<Set<string>>(
    new Set(
      devArtifacts
        .filter((e) => e.confidence !== "Low")
        .map((e) => e.artifact_path)
    )
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Dev filter/sort state
  const [kindFilter, setKindFilter] = useState<Set<ArtifactKind>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleDev = (path: string) =>
    setSelectedDev((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const toggleKindFilter = (kind: ArtifactKind) =>
    setKindFilter((prev) => {
      const next = new Set(prev);
      next.has(kind) ? next.delete(kind) : next.add(kind);
      return next;
    });

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const allKinds = useMemo<ArtifactKind[]>(
    () => [...new Set(devArtifacts.map((e) => e.kind))] as ArtifactKind[],
    [devArtifacts]
  );

  const filteredDevArtifacts = useMemo(() => {
    let list = kindFilter.size > 0
      ? devArtifacts.filter((e) => kindFilter.has(e.kind))
      : devArtifacts;

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "size") cmp = a.size_bytes - b.size_bytes;
      else if (sortKey === "age") cmp = a.age_days - b.age_days;
      else if (sortKey === "name") cmp = a.project_name.localeCompare(b.project_name);
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [devArtifacts, kindFilter, sortKey, sortDir]);

  const lowConfidenceCount = devArtifacts.filter((e) => e.confidence === "Low").length;

  // Junk select-all state
  const junkAllSelected = junkCats.length > 0 && junkCats.every((c) => selected.has(c.category_id));
  const junkSomeSelected = junkCats.some((c) => selected.has(c.category_id));
  const toggleAllJunk = () => {
    if (junkAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(junkCats.map((c) => c.category_id)));
    }
  };

  // Dev select-all state (scoped to filtered list)
  const devAllSelected =
    filteredDevArtifacts.length > 0 &&
    filteredDevArtifacts.every((e) => selectedDev.has(e.artifact_path));
  const devSomeSelected = filteredDevArtifacts.some((e) => selectedDev.has(e.artifact_path));
  const toggleAllDev = () => {
    if (devAllSelected) {
      setSelectedDev((prev) => {
        const next = new Set(prev);
        filteredDevArtifacts.forEach((e) => next.delete(e.artifact_path));
        return next;
      });
    } else {
      setSelectedDev((prev) => {
        const next = new Set(prev);
        filteredDevArtifacts.forEach((e) => next.add(e.artifact_path));
        return next;
      });
    }
  };

  const selectedReport = report.categories.filter((c) => selected.has(c.category_id));
  const totalJunkFiles = selectedReport.reduce((s, c) => s + c.file_count, 0);
  const totalJunkBytes = selectedReport.reduce((s, c) => s + c.total_bytes, 0);

  const selectedDevEntries = devArtifacts.filter((e) => selectedDev.has(e.artifact_path));
  const totalDevBytes = selectedDevEntries.reduce((s, e) => s + e.size_bytes, 0);

  const totalBytes = totalJunkBytes + totalDevBytes;
  const hasAnything = totalJunkFiles > 0 || selectedDevEntries.length > 0;
  const hasResults = report.grand_total_files > 0 || devArtifacts.length > 0;

  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? id;

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 inline ml-1" />
      : <ChevronUp className="w-3 h-3 inline ml-1" />;
  };

  if (!hasResults) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-8">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <h2 className="text-xl font-semibold">Your PC is clean!</h2>
        <p className="text-muted-foreground text-sm">No junk files were found.</p>
        <Button variant="outline" onClick={onScanAgain} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Scan Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">Scan Results</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {report.grand_total_files > 0 && (
            <>
              Found{" "}
              <span className="text-foreground font-medium">
                {report.grand_total_files.toLocaleString()} junk files
              </span>{" "}
              ({formatBytes(report.grand_total_bytes)})
              {devArtifacts.length > 0 && " · "}
            </>
          )}
          {devArtifacts.length > 0 && (
            <>
              <span className="text-foreground font-medium">
                {devArtifacts.length} dev artifact{devArtifacts.length > 1 ? "s" : ""}
              </span>{" "}
              ({formatBytes(devArtifacts.reduce((s, e) => s + e.size_bytes, 0))})
            </>
          )}
        </p>
      </div>

      {/* Tables */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Junk categories table */}
        {report.grand_total_files > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Junk Files
              </h3>
              <span className="text-xs text-muted-foreground">
                {selected.size} of {junkCats.length} selected
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={junkAllSelected}
                      data-state={!junkAllSelected && junkSomeSelected ? "indeterminate" : undefined}
                      onCheckedChange={toggleAllJunk}
                      aria-label="Select all junk categories"
                    />
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {junkCats.map((cat) => (
                  <TableRow
                    key={cat.category_id}
                    className="cursor-pointer"
                    onClick={() => toggle(cat.category_id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(cat.category_id)}
                        onCheckedChange={() => toggle(cat.category_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getCategoryName(cat.category_id)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {cat.file_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatBytes(cat.total_bytes)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dev artifacts table */}
        {devArtifacts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Developer Artifacts
              </h3>
              <span className="text-xs text-muted-foreground">
                {selectedDevEntries.length} of {devArtifacts.length} selected
              </span>
            </div>

            {/* Low confidence warning */}
            {lowConfidenceCount > 0 && (
              <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-md border border-yellow-800 bg-yellow-950/30 text-yellow-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>{lowConfidenceCount} item{lowConfidenceCount > 1 ? "s" : ""}</strong> marked{" "}
                  <span className="text-red-400 font-medium">low confidence</span> — may be a tool or
                  CLI folder. Expand the row to verify the path before deleting. These are not
                  auto-selected.
                </span>
              </div>
            )}

            {/* Filter + sort toolbar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {allKinds.map((kind) => (
                <button
                  key={kind}
                  onClick={() => toggleKindFilter(kind)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    kindFilter.has(kind)
                      ? artifactKindColor[kind] + " border-current"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {artifactKindLabel[kind]}
                </button>
              ))}
              {kindFilter.size > 0 && (
                <button
                  onClick={() => setKindFilter(new Set())}
                  className="text-xs text-muted-foreground underline ml-1"
                >
                  Clear filter
                </button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={devAllSelected}
                      data-state={!devAllSelected && devSomeSelected ? "indeterminate" : undefined}
                      onCheckedChange={toggleAllDev}
                      aria-label="Select all dev artifacts"
                    />
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => handleSortClick("name")}
                    >
                      Project <SortIcon k="name" />
                    </button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSortClick("age")}
                    >
                      Age <SortIcon k="age" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      className="flex items-center hover:text-foreground transition-colors ml-auto"
                      onClick={() => handleSortClick("size")}
                    >
                      Size <SortIcon k="size" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevArtifacts.map((entry) => {
                  const conf = confidenceConfig[entry.confidence];
                  const isExpanded = expandedPath === entry.artifact_path;

                  return (
                    <>
                      <TableRow
                        key={entry.artifact_path}
                        className="cursor-pointer"
                        onClick={() => toggleDev(entry.artifact_path)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedDev.has(entry.artifact_path)}
                            onCheckedChange={() => toggleDev(entry.artifact_path)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs leading-none shrink-0 ${conf.className}`}
                              title={`Confidence: ${conf.label} — ${conf.tooltip}`}
                            >
                              ●
                            </span>
                            <span className="truncate" title={entry.project_path}>
                              {entry.project_name}
                            </span>
                            <button
                              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPath(isExpanded ? null : entry.artifact_path);
                              }}
                              title="View full path"
                            >
                              {isExpanded
                                ? <ChevronUp className="w-3 h-3" />
                                : <ChevronDown className="w-3 h-3" />
                              }
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 font-mono ${artifactKindColor[entry.kind]}`}
                          >
                            {artifactKindLabel[entry.kind]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {entry.age_days}d
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {formatBytes(entry.size_bytes)}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow key={entry.artifact_path + "_path"} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell />
                          <TableCell colSpan={4} className="py-2">
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>
                                <span className="text-foreground/50 mr-1.5">Artifact:</span>
                                <span className="font-mono break-all">{entry.artifact_path}</span>
                              </div>
                              <div>
                                <span className="text-foreground/50 mr-1.5">Project:</span>
                                <span className="font-mono break-all">{entry.project_path}</span>
                              </div>
                              <div className={`mt-1 ${conf.className}`}>
                                Confidence: {conf.label} — {conf.tooltip}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between px-1 pt-1 border-t border-border">
          <span className="text-sm font-bold">TOTAL SELECTED</span>
          <Badge className="font-mono text-xs">{formatBytes(totalBytes)}</Badge>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border flex justify-between items-center">
        <Button variant="outline" onClick={onScanAgain} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Scan Again
        </Button>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={!hasAnything}
          variant="destructive"
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clean Selected ({formatBytes(totalBytes)})
        </Button>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              You are about to permanently delete{" "}
              {totalJunkFiles > 0 && (
                <>
                  <strong>{totalJunkFiles.toLocaleString()} junk files</strong>
                  {selectedDevEntries.length > 0 ? " and " : ""}
                </>
              )}
              {selectedDevEntries.length > 0 && (
                <strong>
                  {selectedDevEntries.length} dev artifact folder
                  {selectedDevEntries.length > 1 ? "s" : ""}
                </strong>
              )}{" "}
              ({formatBytes(totalBytes)}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onClean(Array.from(selected), Array.from(selectedDev));
              }}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
