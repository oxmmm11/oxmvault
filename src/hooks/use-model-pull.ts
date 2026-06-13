"use client";

import { useCallback, useEffect, useState } from "react";
import type { MiSnapshot, ModelSnapshot } from "@/components/console/types";

const DEFAULT_MODEL_SNAPSHOT: ModelSnapshot = {
  target: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
  status: "standby",
  progress: 0,
  localReady: false,
  localEngine: "webgpu",
};

export function useModelPull(initialMiSnapshot: MiSnapshot) {
  const [miScanning, setMiScanning] = useState(false);
  const [miSnapshot, setMiSnapshot] = useState<MiSnapshot>(initialMiSnapshot);
  const [modelSnapshot, setModelSnapshot] = useState<ModelSnapshot>(DEFAULT_MODEL_SNAPSHOT);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_SNAPSHOT.target);

  useEffect(() => {
    let cancelled = false;

    async function pollModelPull() {
      try {
        const res = await fetch("/api/model-pull", { cache: "no-store" });
        const data = (await res.json()) as ModelSnapshot;
        if (!cancelled) {
          setModelSnapshot({
            target: data.target,
            status: data.status,
            progress: data.progress,
            localReady: data.localReady,
            localEngine: data.localEngine,
          });
          setSelectedModel(data.target);
        }
      } catch {
        if (!cancelled) {
          setModelSnapshot((prev) => ({ ...prev, status: "offline" }));
        }
      }
    }

    void pollModelPull();
    const timer = window.setInterval(() => {
      void pollModelPull();
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!miScanning) return;

    const timer = window.setInterval(async () => {
      try {
        const res = await fetch("/api/model-pull", { cache: "no-store" });
        const data = (await res.json()) as {
          status: string;
          progress: number;
          detected: { cores: string; memory: string; gpu: string };
          localReady?: boolean;
        };

        setMiSnapshot({
          cores: data.detected.cores,
          memory: data.detected.memory,
          gpu: data.detected.gpu,
          pull: data.status,
          progress: data.progress,
        });

        if (data.progress >= 100 || data.localReady) {
          setMiScanning(false);
        }
      } catch {
        setMiScanning(false);
      }
    }, 700);

    return () => window.clearInterval(timer);
  }, [miScanning]);

  const handleMiScan = useCallback(async () => {
    if (miScanning) return;
    setMiScanning(true);
    setMiSnapshot((prev) => ({ ...prev, cores: "scanning", memory: "scanning", gpu: "probing", pull: "queueing", progress: 4 }));

    const cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : "unknown";
    const memory = typeof navigator !== "undefined" && "deviceMemory" in navigator ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory || "unknown"} GB` : "unknown";

    let gpu = "unavailable";
    try {
      const nav = navigator as Navigator & {
        gpu?: {
          requestAdapter?: () => Promise<{ name?: string } | null>;
        };
      };
      if (nav.gpu?.requestAdapter) {
        const adapter = await nav.gpu.requestAdapter();
        gpu = adapter?.name || "webgpu";
      }
    } catch {
      gpu = "blocked";
    }

    await fetch("/api/model-pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: selectedModel,
        detected: { cores, memory, gpu },
      }),
    });
  }, [miScanning, selectedModel]);

  return {
    handleMiScan,
    miScanning,
    miSnapshot,
    modelSnapshot,
    selectedModel,
    setMiSnapshot,
    setSelectedModel,
  };
}
