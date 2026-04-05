import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ScanProgressPayload } from "@/types";

export function useScanProgress() {
  const [progress, setProgress] = useState<ScanProgressPayload | null>(null);

  useEffect(() => {
    const unlisten = listen<ScanProgressPayload>("scan-progress", (e) => {
      setProgress(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return progress;
}
