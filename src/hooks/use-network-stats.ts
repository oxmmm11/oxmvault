"use client";

import { useEffect, useState } from "react";

export type NetworkStats = {
  totalBlocks: number;
  totalBlocksCap: number;
  totalPoints: number;
  totalPointsCap: number;
  activeContributors: number;
  totalWeight: number;
  globalBlocksPerSecond: number;
  walletShare: number;
  walletBlocks: number;
  walletPoints: number;
};

const DEFAULT_NETWORK_STATS: NetworkStats = {
  totalBlocks: 0,
  totalBlocksCap: 537600000,
  totalPoints: 0,
  totalPointsCap: 2100000,
  activeContributors: 0,
  totalWeight: 0,
  globalBlocksPerSecond: 0,
  walletShare: 0,
  walletBlocks: 0,
  walletPoints: 0,
};

export function useNetworkStats(wallet?: string, active?: boolean, weight?: number) {
  const [stats, setStats] = useState<NetworkStats>(DEFAULT_NETWORK_STATS);

  useEffect(() => {
    let cancelled = false;

    async function pull() {
      try {
        const suffix = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
        const res = await fetch(`/api/network-stats${suffix}`, { cache: "no-store" });
        const data = (await res.json()) as NetworkStats;
        if (!cancelled) setStats(data);
      } catch {
        // ignore
      }
    }

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [wallet]);

  useEffect(() => {
    if (!active || !wallet) return;
    let cancelled = false;

    async function heartbeat() {
      try {
        const res = await fetch("/api/network-stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet, weight, userAgent: navigator.userAgent }),
        });
        const data = (await res.json()) as NetworkStats;
        if (!cancelled) setStats(data);
      } catch {
        // ignore
      }
    }

    void heartbeat();
    const timer = window.setInterval(() => {
      void heartbeat();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, wallet, weight]);

  return stats;
}
