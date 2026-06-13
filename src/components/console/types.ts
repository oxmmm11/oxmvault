export type Message = {
  id: number;
  role: "user" | "mesh";
  text: string;
};

export type SessionItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export type StoredState = {
  sessions: SessionItem[];
  messagesBySession: Record<string, Message[]>;
};

export type MiSnapshot = {
  cores: string;
  memory: string;
  gpu: string;
  pull: string;
  progress: number;
};

export type WebGpuSnapshot = {
  adapter: string;
  cache: string;
  queue: string;
};

export type ModelSnapshot = {
  target: string;
  status: string;
  progress: number;
  localReady?: boolean;
  localEngine?: string;
};

export type RuntimeSnapshot = {
  infer: { status: string; progress: number; target: string };
  train: { status: string; progress: number; target: string; dataset: string; epoch: string; batch: string };
};

export type ContributionState = {
  wallet: string;
  walletBound: boolean;
  contributedSeconds: number;
  points: number;
  sentMessages: number;
  unlockUntil: number;
  unlimited: boolean;
  contributing: boolean;
  weight: number;
  blocksEarned: number;
  blockReward: number;
};
