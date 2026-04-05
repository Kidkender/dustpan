import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import type { CleanReport } from "@/types";

interface DonePageProps {
  report: CleanReport;
  onScanAgain: () => void;
}

export function DonePage({ report, onScanAgain }: DonePageProps) {
  const hasSkipped = report.skipped.length > 0;

  return (
    <div className="flex flex-col h-full items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-8 flex flex-col items-center gap-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-foreground">
              Freed {formatBytes(report.freed_bytes)}
            </h2>
            <p className="text-sm text-muted-foreground">
              Deleted {report.deleted_count.toLocaleString()} files successfully
            </p>
          </div>

          {hasSkipped && (
            <div className="w-full">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {report.skipped.length} files could not be deleted
                </span>
              </div>
              <ScrollArea className="h-32 rounded-md border border-border bg-muted/30 p-3">
                {report.skipped.map(([path, reason], i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <p className="text-xs font-mono text-muted-foreground break-all">{path}</p>
                    <p className="text-xs text-yellow-600">{reason}</p>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          <Button onClick={onScanAgain} className="w-full gap-2">
            <RotateCcw className="w-4 h-4" />
            Scan Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
