import { NextResponse } from "next/server";

type ContributorEntry = {
  wallet: string;
  weight: number;
  lastSeen: number;
  startedAt: number;
  userAgent: string;
};

type NetworkStore = {
  totalBlocks: number;
  totalBlocksCap: number;
  blocksPerPoint: number;
  globalBlocksPerSecond: number;
  contributors: Record<string, ContributorEntry>;
  lastTick: number;
};

declare global {
  var __oxmvaultNetworkStore: NetworkStore | undefined;
}

const TOTAL_BLOCKS_CAP = 537600000;
const HEARTBEAT_TTL_MS = 90_000;
const GLOBAL_BLOCKS_PER_SECOND = 1 / (56 * 60);

function getStore() {
  if (!globalThis.__oxmvaultNetworkStore) {
    globalThis.__oxmvaultNetworkStore = {
      totalBlocks: 0,
      totalBlocksCap: TOTAL_BLOCKS_CAP,
      blocksPerPoint: 256,
      globalBlocksPerSecond: GLOBAL_BLOCKS_PER_SECOND,
      contributors: {},
      lastTick: Date.now(),
    };
  }
  return globalThis.__oxmvaultNetworkStore;
}

function prune(store: NetworkStore, now: number) {
  for (const [key, value] of Object.entries(store.contributors)) {
    if (now - value.lastSeen > HEARTBEAT_TTL_MS) delete store.contributors[key];
  }
}

function tick(store: NetworkStore, now: number) {
  prune(store, now);
  const elapsed = Math.max(0, (now - store.lastTick) / 1000);
  if (elapsed > 0) {
    store.totalBlocks = Math.min(store.totalBlocksCap, store.totalBlocks + elapsed * store.globalBlocksPerSecond);
    store.lastTick = now;
  }
}

function series(seed: number, spikesEvery: number, base: number, amp: number) {
  return Array.from({ length: 28 }, (_, i) => {
    const wave = base + Math.sin((i + seed) / 2.4) * amp;
    const spike = (i + seed) % spikesEvery === 0 ? amp * 2.2 : 0;
    return wave + spike;
  });
}

function path(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);
  return values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export async function GET() {
  const store = getStore();
  const now = Date.now();
  tick(store, now);

  const blocks = store.totalBlocks;
  const contributors = Object.keys(store.contributors).length;
  const percent = ((blocks / store.totalBlocksCap) * 100).toFixed(4);
  const blockPath = path(series(Math.floor(blocks) % 17, 6, 46, 10), 760, 70);
  const contributorPath = path(series(contributors % 11, 7, 28, 8), 760, 70);

  const svg = `
<svg width="960" height="320" viewBox="0 0 960 320" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="OXMVault network pulse">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="960" y2="320" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0B1220"/>
      <stop offset="1" stop-color="#090D18"/>
    </linearGradient>
    <linearGradient id="lineA" x1="100" y1="0" x2="860" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#71E4FF"/>
      <stop offset="1" stop-color="#FFB86B"/>
    </linearGradient>
    <linearGradient id="lineB" x1="100" y1="0" x2="860" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#FF7AA2"/>
    </linearGradient>
  </defs>
  <rect width="960" height="320" rx="24" fill="url(#bg)"/>
  <rect x="1" y="1" width="958" height="318" rx="23" stroke="rgba(255,255,255,0.08)"/>
  <g opacity="0.28">
    <path d="M80 116H880" stroke="#71E4FF" stroke-opacity="0.18"/>
    <path d="M80 208H880" stroke="#FFB86B" stroke-opacity="0.16"/>
    <path d="M80 70V258" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <path d="M280 70V258" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <path d="M480 70V258" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <path d="M680 70V258" stroke="#FFFFFF" stroke-opacity="0.05"/>
    <path d="M880 70V258" stroke="#FFFFFF" stroke-opacity="0.08"/>
  </g>
  <text x="80" y="48" fill="#EAF4FF" font-size="26" font-family="Arial, sans-serif">OXMVault</text>
  <text x="80" y="92" fill="#9DB4CC" font-size="16" font-family="Arial, sans-serif">website pulse</text>
  <text x="80" y="288" fill="#71E4FF" font-size="14" font-family="Arial, sans-serif">b ${blocks.toFixed(4)} • ${percent}%</text>
  <text x="708" y="288" fill="#FFB86B" font-size="14" font-family="Arial, sans-serif">n ${contributors}</text>
  <path d="${blockPath}" transform="translate(100 92)" stroke="url(#lineA)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${contributorPath}" transform="translate(100 184)" stroke="url(#lineB)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
