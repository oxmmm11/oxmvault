import { NextRequest, NextResponse } from "next/server";

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
const BLOCKS_PER_POINT = 256;
const GLOBAL_BLOCKS_PER_SECOND = 1 / (56 * 60);
const HEARTBEAT_TTL_MS = 90_000;

function getStore() {
  if (!globalThis.__oxmvaultNetworkStore) {
    globalThis.__oxmvaultNetworkStore = {
      totalBlocks: 0,
      totalBlocksCap: TOTAL_BLOCKS_CAP,
      blocksPerPoint: BLOCKS_PER_POINT,
      globalBlocksPerSecond: GLOBAL_BLOCKS_PER_SECOND,
      contributors: {},
      lastTick: Date.now(),
    };
  }

  return globalThis.__oxmvaultNetworkStore;
}

function pruneContributors(store: NetworkStore, now: number) {
  for (const [key, value] of Object.entries(store.contributors)) {
    if (now - value.lastSeen > HEARTBEAT_TTL_MS) delete store.contributors[key];
  }
}

function tickStore(store: NetworkStore, now: number) {
  pruneContributors(store, now);
  const elapsedSeconds = Math.max(0, (now - store.lastTick) / 1000);
  if (elapsedSeconds > 0) {
    store.totalBlocks = Math.min(store.totalBlocksCap, store.totalBlocks + elapsedSeconds * store.globalBlocksPerSecond);
    store.lastTick = now;
  }
}

function buildPayload(store: NetworkStore, wallet?: string) {
  const activeContributors = Object.keys(store.contributors).length;
  const totalWeight = Object.values(store.contributors).reduce((sum, item) => sum + item.weight, 0);
  const walletEntry = wallet ? store.contributors[wallet] : undefined;
  const walletShare = walletEntry && totalWeight > 0 ? walletEntry.weight / totalWeight : 0;
  const walletBlocks = store.totalBlocks * walletShare;
  const walletPoints = walletBlocks / store.blocksPerPoint;

  return {
    totalBlocks: Number(store.totalBlocks.toFixed(4)),
    totalBlocksCap: store.totalBlocksCap,
    totalPoints: Number((store.totalBlocks / store.blocksPerPoint).toFixed(7)),
    totalPointsCap: store.totalBlocksCap / store.blocksPerPoint,
    activeContributors,
    totalWeight: Number(totalWeight.toFixed(2)),
    globalBlocksPerSecond: store.globalBlocksPerSecond,
    walletShare,
    walletBlocks: Number(walletBlocks.toFixed(4)),
    walletPoints: Number(walletPoints.toFixed(7)),
  };
}

export async function GET(request: NextRequest) {
  const store = getStore();
  const now = Date.now();
  tickStore(store, now);
  const wallet = request.nextUrl.searchParams.get("wallet") || undefined;
  return NextResponse.json(buildPayload(store, wallet));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { wallet?: string; weight?: number; userAgent?: string };
  const wallet = body.wallet?.trim();
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  const store = getStore();
  const now = Date.now();
  tickStore(store, now);
  const previous = store.contributors[wallet];
  store.contributors[wallet] = {
    wallet,
    weight: Math.min(10, Math.max(1, Number(body.weight) || 1)),
    lastSeen: now,
    startedAt: previous?.startedAt || now,
    userAgent: body.userAgent || previous?.userAgent || "unknown",
  };

  return NextResponse.json(buildPayload(store, wallet));
}
