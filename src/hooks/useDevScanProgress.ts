import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { DevScanProgressPayload } from "@/types";

export function useDevScanProgress() {
  const [progress, setProgress] = useState<DevScanProgressPayload | null>(null);

  useEffect(() => {
    const unlisten = listen<DevScanProgressPayload>("dev-scan-progress", (e) => {
      setProgress(e.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return progress;
}
