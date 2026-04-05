import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import type { CleanProgressPayload } from "@/types";

export function useCleanProgress() {
  const [progress, setProgress] = useState<CleanProgressPayload | null>(null);
  const pendingRef = useRef<CleanProgressPayload | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const unlisten = listen<CleanProgressPayload>("clean-progress", (e) => {
      // Store latest payload without triggering re-render immediately
      pendingRef.current = e.payload;

      // Schedule a single RAF to flush — coalesces rapid events into one render
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          if (pendingRef.current !== null) {
            setProgress(pendingRef.current);
          }
        });
      }
    });

    return () => {
      unlisten.then((f) => f());
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return progress;
}
