import { NextRequest, NextResponse } from "next/server";

type PullState = {
  target: string;
  status: string;
  progress: number;
  localReady: boolean;
  localEngine: string;
  lastUpdate: string;
  detected: {
    cores: string;
    memory: string;
    gpu: string;
  };
};

declare global {
  var __oxmvaultPullState: PullState | undefined;
}

function getStore() {
  if (!globalThis.__oxmvaultPullState) {
    globalThis.__oxmvaultPullState = {
      target: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      status: "idle",
      progress: 0,
      localReady: false,
      localEngine: "webgpu",
      lastUpdate: new Date().toISOString(),
      detected: {
        cores: "unknown",
        memory: "unknown",
        gpu: "unknown",
      },
    };
  }

  return globalThis.__oxmvaultPullState;
}

export async function GET() {
  return NextResponse.json(getStore());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    target?: string;
    detected?: {
      cores?: string;
      memory?: string;
      gpu?: string;
    };
  };

  const store = getStore();
  store.target = body.target || store.target;
  store.status = "loading local line";
  store.progress = 8;
  store.localReady = false;
  store.lastUpdate = new Date().toISOString();
  store.detected = {
    cores: body.detected?.cores || store.detected.cores,
    memory: body.detected?.memory || store.detected.memory,
    gpu: body.detected?.gpu || store.detected.gpu,
  };

  // Simulate staged pull state so the UI can show a real chain.
  setTimeout(() => {
    const next = getStore();
    next.status = "resolving manifest";
    next.progress = 28;
    next.lastUpdate = new Date().toISOString();
  }, 800);

  setTimeout(() => {
    const next = getStore();
    next.status = "downloading weights";
    next.progress = 61;
    next.lastUpdate = new Date().toISOString();
  }, 1800);

  setTimeout(() => {
    const next = getStore();
    next.status = "warming runtime";
    next.progress = 86;
    next.lastUpdate = new Date().toISOString();
  }, 3200);

  setTimeout(() => {
    const next = getStore();
    next.status = "local line ready";
    next.progress = 100;
    next.localReady = true;
    next.lastUpdate = new Date().toISOString();
  }, 4600);

  return NextResponse.json(store);
}
