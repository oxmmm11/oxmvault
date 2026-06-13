"use client";

import { useEffect, useState } from "react";
import type { RuntimeSnapshot } from "@/components/console/types";

const DEFAULT_RUNTIME_SNAPSHOT: RuntimeSnapshot = {
  infer: { status: "idle", progress: 0, target: "webgpu-local" },
  train: { status: "idle", progress: 0, target: "gpt-4.1", dataset: "dataset.jsonl", epoch: "1", batch: "4" },
};

export function useRuntimeSnapshot() {
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeSnapshot>(DEFAULT_RUNTIME_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;

    async function pollRuntimeTask() {
      try {
        const res = await fetch("/api/runtime-task", { cache: "no-store" });
        const data = (await res.json()) as RuntimeSnapshot;
        if (!cancelled) {
          setRuntimeSnapshot(data);
        }
      } catch {
        // ignore polling errors
      }
    }

    void pollRuntimeTask();
    const timer = window.setInterval(() => {
      void pollRuntimeTask();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return runtimeSnapshot;
}
