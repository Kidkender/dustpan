import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useCleanProgress } from "@/hooks/useCleanProgress";
import { formatBytes } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export function CleaningPage() {
  const progress = useCleanProgress();

  const percent =
    progress && progress.total_files > 0
      ? Math.round((progress.deleted_count / progress.total_files) * 100)
      : 0;

  const truncatePath = (path: string, max = 55) =>
    path.length > max ? "..." + path.slice(-max) : path;

  return (
    <div className="flex flex-col h-full items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 px-8 flex flex-col items-center gap-6">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-destructive animate-pulse" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Cleaning up...</h2>
            {progress?.current_file && (
              <p className="text-xs text-muted-foreground font-mono break-all">
                {truncatePath(progress.current_file)}
              </p>
            )}
          </div>

          <div className="w-full space-y-2">
            <Progress value={percent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progress
                  ? `${progress.deleted_count.toLocaleString()} of ${progress.total_files.toLocaleString()} files`
                  : "Starting..."}
              </span>
              <span>{percent}%</span>
            </div>
          </div>

          {progress && (
            <p className="text-sm text-primary font-medium">
              Freed {formatBytes(progress.freed_bytes)} so far
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
