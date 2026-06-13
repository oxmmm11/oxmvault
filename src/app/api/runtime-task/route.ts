import { NextRequest, NextResponse } from "next/server";

type RuntimeTaskState = {
  infer: {
    status: string;
    progress: number;
    target: string;
  };
  train: {
    status: string;
    progress: number;
    target: string;
    dataset: string;
    epoch: string;
    batch: string;
  };
};

declare global {
  var __oxmvaultRuntimeTask: RuntimeTaskState | undefined;
}

function getStore() {
  if (!globalThis.__oxmvaultRuntimeTask) {
    globalThis.__oxmvaultRuntimeTask = {
      infer: {
        status: "idle",
        progress: 0,
        target: "webgpu-local",
      },
      train: {
        status: "idle",
        progress: 0,
        target: "gpt-4.1",
        dataset: "dataset.jsonl",
        epoch: "1",
        batch: "4",
      },
    };
  }

  return globalThis.__oxmvaultRuntimeTask;
}

export async function GET() {
  return NextResponse.json(getStore());
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    kind?: "infer" | "train";
    target?: string;
  };

  const kind = body.kind || "infer";
  const store = getStore();

  if (kind === "infer") {
    store.infer = {
      status: "probing webgpu",
      progress: 10,
      target: body.target || store.infer.target,
    };

    setTimeout(() => {
      const next = getStore();
      next.infer.status = "loading graph";
      next.infer.progress = 38;
    }, 900);

    setTimeout(() => {
      const next = getStore();
      next.infer.status = "running kernels";
      next.infer.progress = 68;
    }, 2100);

    setTimeout(() => {
      const next = getStore();
      next.infer.status = "ready";
      next.infer.progress = 100;
    }, 3600);
  } else {
    store.train = {
      ...store.train,
      status: "waiting for model pull",
      progress: 6,
      target: body.target || store.train.target,
    };

    setTimeout(() => {
      const next = getStore();
      next.train.status = "download complete";
      next.train.progress = 24;
    }, 1200);

    setTimeout(() => {
      const next = getStore();
      next.train.status = "allocating trainer";
      next.train.progress = 42;
    }, 2300);

    setTimeout(() => {
      const next = getStore();
      next.train.status = "warming optimizer";
      next.train.progress = 68;
    }, 3600);

    setTimeout(() => {
      const next = getStore();
      next.train.status = "training";
      next.train.progress = 86;
    }, 4700);

    setTimeout(() => {
      const next = getStore();
      next.train.status = `epoch ${next.train.epoch} live`;
      next.train.progress = 100;
    }, 6200);
  }

  return NextResponse.json(store);
}
