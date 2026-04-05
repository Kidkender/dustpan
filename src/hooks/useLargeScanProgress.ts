import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { LargeScanProgressPayload } from "@/types";

export function useLargeScanProgress() {
  const [progress, setProgress] = useState<LargeScanProgressPayload | null>(null);

  useEffect(() => {
    const unlisten = listen<LargeScanProgressPayload>("large-scan-progress", (e) => {
      setProgress(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return progress;
}
