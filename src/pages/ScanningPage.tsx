import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useScanProgress } from "@/hooks/useScanProgress";
import { useDevScanProgress } from "@/hooks/useDevScanProgress";
import { formatBytes } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

interface ScanningPageProps {
  devEnabled: boolean;
  onCancel: () => void;
}

export function ScanningPage({ devEnabled, onCancel }: ScanningPageProps) {
  const progress = useScanProgress();
  const devProgress = useDevScanProgress();

  const junkPercent = progress
    ? Math.round((progress.categories_done / progress.categories_total) * 100)
    : 0;

  return (
    <div className="flex flex-col h-full items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Scanning your PC</h2>
          <p className="text-sm text-muted-foreground">
            This may take a while depending on drive size
          </p>
        </div>

        {/* Junk scan progress */}
        {progress && progress.categories_total > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground uppercase tracking-wide">
                Junk Files
              </span>
              <span className="text-xs text-muted-foreground">
                {progress.categories_done}/{progress.categories_total}
              </span>
            </div>
            <Progress value={junkPercent} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[200px]" title={progress.category_id}>
                {progress.category_id}
              </span>
              <span className="shrink-0 ml-2">
                {progress.files_found.toLocaleString()} files · {formatBytes(progress.bytes_found)}
              </span>
            </div>
          </div>
        )}

        {/* Dev artifacts scan progress */}
        {devEnabled && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground uppercase tracking-wide">
                Dev Artifacts
              </span>
              {devProgress && (
                <span className="text-xs text-muted-foreground">
                  {devProgress.found_count} found
                </span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              {devProgress ? (
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: devProgress.found_count > 0 ? "100%" : "30%" }}
                />
              ) : (
                <div className="h-full bg-primary/40 rounded-full animate-pulse w-1/3" />
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {devProgress
                ? `${devProgress.found_count} artifact${devProgress.found_count !== 1 ? "s" : ""} · ${formatBytes(devProgress.total_size_bytes)}`
                : "Searching drives..."}
            </div>
          </div>
        )}

        {/* Idle state — no progress yet */}
        {!progress && (!devEnabled || !devProgress) && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Preparing scan...
            </div>
          </div>
        )}

        {/* Cancel button */}
        <div className="flex justify-center pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gap-2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
