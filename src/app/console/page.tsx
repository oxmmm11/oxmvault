"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/console/chat-panel";
import { ConsoleSidebar } from "@/components/console/sidebar";
import { ControlTower } from "@/components/console/control-tower";
import { ConsoleTopbar } from "@/components/console/topbar";
import type { ContributionState, MiSnapshot, SessionItem, StoredState, WebGpuSnapshot } from "@/components/console/types";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useModelPull } from "@/hooks/use-model-pull";
import { useRuntimeSnapshot } from "@/hooks/use-runtime-snapshot";
import { DEFAULT_LOCAL_MODEL, useLocalModel } from "@/hooks/use-local-model";
import { useNetworkStats } from "@/hooks/use-network-stats";

const initialSessions: SessionItem[] = [
  { id: "session-01", title: "Mesh Command", updatedAt: "just now" },
  { id: "session-02", title: "Deploy Route", updatedAt: "8m" },
  { id: "session-03", title: "Runtime Pulse", updatedAt: "27m" },
];

const quickCommands = [
  "show web status",
  "deploy latest build",
  "tail nginx logs",
  "restart edge runtime",
  "inspect ssl route",
  "sync command line",
];

const STORAGE_KEY = "oxmvault-console-state";
const LANDING_PROMPT_KEY = "oxmvault-landing-prompt";
const MI_SNAPSHOT_KEY = "oxmvault-mi-snapshot";
const CONTRIBUTION_KEY = "oxmvault-contribution-state-v5";
const TOTAL_BLOCKS = 537600000;
const BLOCKS_PER_POINT = 256;
const MAX_WEIGHT = 10;
const DEFAULT_MI_SNAPSHOT: MiSnapshot = {
  cores: "idle",
  memory: "idle",
  gpu: "idle",
  pull: "standby",
  progress: 0,
};
const DEFAULT_STORED_STATE: StoredState = {
  sessions: initialSessions,
  messagesBySession: {},
};
const DEFAULT_CONTRIBUTION_STATE: ContributionState = {
  wallet: "",
  walletBound: false,
  contributedSeconds: 0,
  points: 0,
  sentMessages: 0,
  unlockUntil: 0,
  unlimited: false,
  contributing: false,
  weight: 1,
  blocksEarned: 0,
  blockReward: 1 / BLOCKS_PER_POINT,
};

function formatUpdatedAt() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function deriveTitle(text: string) {
  return text.trim().slice(0, 28) || "Untitled Session";
}

function getInitialChatMode() {
  return typeof window !== "undefined" && window.location.search.includes("mode=chat");
}

function getDeviceWeight(adapterName: string, _coresLabel: string, _memoryLabel: string) {
  const adapter = adapterName.toLowerCase();
  const mobileUa = typeof navigator !== "undefined" ? /android|iphone|ipad|mobile/i.test(navigator.userAgent) : false;

  if (adapter.includes("apple m5")) return 10;
  if (adapter.includes("apple m4")) return 8;
  if (adapter.includes("apple m3")) return 6;
  if (adapter.includes("apple m2")) return 4;
  if (adapter.includes("apple m1")) return 2;
  if (mobileUa) return 1.75;
  return 2;
}

export default function ConsolePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [storedState, setStoredState] = useLocalStorageState<StoredState>(STORAGE_KEY, DEFAULT_STORED_STATE);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<number | null>(null);
  const [streamingTarget, setStreamingTarget] = useState("");
  const [activeSessionId, setActiveSessionId] = useState(storedState.sessions[0]?.id || "session-01");
  const [chatMode] = useState(getInitialChatMode);
  const [miStoredSnapshot] = useLocalStorageState<MiSnapshot>(MI_SNAPSHOT_KEY, DEFAULT_MI_SNAPSHOT);
  const [contribution, setContribution] = useLocalStorageState<ContributionState>(CONTRIBUTION_KEY, DEFAULT_CONTRIBUTION_STATE);
  const { handleMiScan, miScanning, miSnapshot, modelSnapshot } = useModelPull(miStoredSnapshot);
  const runtimeSnapshot = useRuntimeSnapshot();
  const { localModel, ensureModel, generate } = useLocalModel();
  const networkStats = useNetworkStats(contribution.wallet || undefined, contribution.contributing, contribution.weight);
  const [webgpuSnapshot, setWebgpuSnapshot] = useState<WebGpuSnapshot>({
    adapter: "probing",
    cache: "cold",
    queue: "idle",
  });
  const timerRef = useRef<number | null>(null);
  const messageIdRef = useRef(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const sessions = storedState.sessions;
  const messagesBySession = storedState.messagesBySession;
  const feed = useMemo(() => messagesBySession[activeSessionId] || [], [messagesBySession, activeSessionId]);
  const userName = session?.user?.name || "Vault Operator";
  const userEmail = session?.user?.email || "linked";
  const userImage = session?.user?.image || "";

  useEffect(() => {
    setContribution((prev) => {
      const blockReward = prev.blockReward || (1 / BLOCKS_PER_POINT);
      const inferredWeight = prev.weight && prev.weight > 0 ? prev.weight : 1;
      const normalizedWallet = prev.wallet.startsWith("tao_") ? "" : prev.wallet;
      const nextBlocks = prev.contributing ? networkStats.walletBlocks : prev.blocksEarned;
      const nextPoints = prev.contributing ? networkStats.walletPoints : Number((nextBlocks * blockReward).toFixed(7));

      if (
        prev.blockReward === blockReward &&
        prev.weight === inferredWeight &&
        prev.walletBound === Boolean(normalizedWallet) &&
        prev.wallet === normalizedWallet &&
        prev.blocksEarned === nextBlocks &&
        prev.points === nextPoints
      ) {
        return prev;
      }

      return {
        ...prev,
        wallet: normalizedWallet,
        walletBound: Boolean(normalizedWallet),
        blockReward,
        blocksEarned: nextBlocks,
        weight: inferredWeight,
        points: nextPoints,
      };
    });
  }, [networkStats.walletBlocks, networkStats.walletPoints, setContribution]);

  useEffect(() => {
    if (!contribution.contributing) return;

    const timer = window.setInterval(() => {
      setContribution((prev) => {
        const nextSeconds = prev.contributedSeconds + 1;
        const nextUnlimited = networkStats.totalBlocks >= TOTAL_BLOCKS;
        let nextUnlockUntil = prev.unlockUntil;

        if (nextUnlimited) {
          nextUnlockUntil = Number.MAX_SAFE_INTEGER;
        } else if (networkStats.walletBlocks >= 128) {
          nextUnlockUntil = Date.now() + 7 * 24 * 3600 * 1000;
        } else if (networkStats.walletBlocks >= 32) {
          nextUnlockUntil = Date.now() + 24 * 3600 * 1000;
        }

        return {
          ...prev,
          contributedSeconds: nextSeconds,
          blocksEarned: networkStats.walletBlocks,
          points: networkStats.walletPoints,
          unlockUntil: nextUnlockUntil,
          unlimited: nextUnlimited,
        };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [contribution.contributing, networkStats.totalBlocks, networkStats.walletBlocks, networkStats.walletPoints, setContribution]);

  const hasTimeUnlock = contribution.unlimited || contribution.unlockUntil > nowMs;
  const earnedMessageBlocks = Math.floor(contribution.blocksEarned / 5) * 5;
  const allowedMessages = hasTimeUnlock ? Number.MAX_SAFE_INTEGER : 5 + earnedMessageBlocks;
  const remainingMessageCount = hasTimeUnlock ? "Unlimited" : Math.max(0, allowedMessages - contribution.sentMessages).toString();
  const lockReason = hasTimeUnlock || contribution.sentMessages < allowedMessages
    ? ""
    : "Contribute for more messages.";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [router, status]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probeWebGpu() {
      let adapterName = "unavailable";
      let queue = "blocked";
      try {
        const nav = navigator as Navigator & {
          gpu?: {
            requestAdapter?: () => Promise<{ name?: string } | null>;
          };
        };
        if (nav.gpu?.requestAdapter) {
          const adapter = await nav.gpu.requestAdapter();
          adapterName = adapter?.name || "webgpu";
          queue = "ready";
        }
      } catch {
        adapterName = "blocked";
        queue = "blocked";
      }

      if (!cancelled) {
        setWebgpuSnapshot({
          adapter: adapterName,
          cache: adapterName === "unavailable" || adapterName === "blocked" ? "cold" : "warm",
          queue,
        });
      }
    }

    void probeWebGpu();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (streamingId === null) return;
    if (timerRef.current) window.clearInterval(timerRef.current);

    let index = 0;
    timerRef.current = window.setInterval(() => {
      index += 3;
      const nextText = streamingTarget.slice(0, index);
      setStoredState((prev) => ({
        ...prev,
        messagesBySession: {
          ...prev.messagesBySession,
          [activeSessionId]: (prev.messagesBySession[activeSessionId] || []).map((msg) =>
            msg.id === streamingId ? { ...msg, text: nextText } : msg,
          ),
        },
      }));

      if (index >= streamingTarget.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setStreamingId(null);
      }
    }, 18);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [activeSessionId, setStoredState, streamingId, streamingTarget]);

  const nextMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  }, []);

  const createSession = useCallback((seed?: string) => {
    const id = `session-${crypto.randomUUID()}`;
    const item: SessionItem = {
      id,
      title: seed ? deriveTitle(seed) : "New Session",
      updatedAt: formatUpdatedAt(),
    };
    setStoredState((prev) => ({
      sessions: [item, ...prev.sessions],
      messagesBySession: { ...prev.messagesBySession, [id]: [] },
    }));
    setActiveSessionId(id);
    return id;
  }, [setStoredState]);

  const sendMessage = useCallback(async (messageOverride?: string) => {
    const value = (messageOverride ?? prompt).trim();
    if (!value || loading || streamingId !== null) return;
    if (!hasTimeUnlock && contribution.sentMessages >= allowedMessages) return;

    const targetSessionId = activeSessionId || createSession(value);
    const nextId = nextMessageId();

    setStoredState((prev) => ({
      sessions: prev.sessions.map((item) =>
        item.id === targetSessionId
          ? { ...item, title: item.title === "New Session" ? deriveTitle(value) : item.title, updatedAt: formatUpdatedAt() }
          : item,
      ),
      messagesBySession: {
        ...prev.messagesBySession,
        [targetSessionId]: [...(prev.messagesBySession[targetSessionId] || []), { id: nextId, role: "user", text: value }],
      },
    }));
    setContribution((prev) => ({ ...prev, sentMessages: prev.sentMessages + 1 }));
    setPrompt("");
    setLoading(true);

    try {
      let reply = "No line returned.";

      if (contribution.contributing) {
        if (!localModel.ready) {
          reply = localModel.loading || localModel.status === "loading browser model"
            ? `Local line loading ${localModel.progress}%.`
            : `Local line offline: ${localModel.status || "idle"}`;
        } else {
          reply = await generate(value);
        }
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: value,
            model: DEFAULT_LOCAL_MODEL,
            usePulledModel: false,
          }),
        });

        const data = await res.json();
        reply = data.reply || data.error || "No line returned.";
      }

      const meshId = nextId + 1;
      setStoredState((prev) => ({
        ...prev,
        messagesBySession: {
          ...prev.messagesBySession,
          [targetSessionId]: [...(prev.messagesBySession[targetSessionId] || []), { id: meshId, role: "mesh", text: "" }],
        },
      }));
      setStreamingTarget(reply);
      setStreamingId(meshId);
    } catch (error) {
      const meshId = nextId + 1;
      const message = error instanceof Error ? error.message : "The compute mesh could not return a response.";
      setStoredState((prev) => ({
        ...prev,
        messagesBySession: {
          ...prev.messagesBySession,
          [targetSessionId]: [
            ...(prev.messagesBySession[targetSessionId] || []),
            { id: meshId, role: "mesh", text: message },
          ],
        },
      }));
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, allowedMessages, contribution.contributing, contribution.sentMessages, createSession, generate, hasTimeUnlock, loading, localModel.loading, localModel.progress, localModel.ready, localModel.status, nextMessageId, prompt, setContribution, setStoredState, streamingId]);

  useEffect(() => {
    if (!session || loading || streamingId !== null) return;
    const pending = window.localStorage.getItem(LANDING_PROMPT_KEY)?.trim();
    if (!pending) return;
    window.localStorage.removeItem(LANDING_PROMPT_KEY);
    window.setTimeout(() => {
      void sendMessage(pending);
    }, 0);
  }, [loading, sendMessage, session, streamingId]);

  const triggerRuntimeTask = useCallback(async (kind: "infer" | "train") => {
    await fetch("/api/runtime-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, target: DEFAULT_LOCAL_MODEL }),
    });
  }, []);

  const handleBindWallet = useCallback((address: string) => {
    setContribution((prev) => ({
      ...prev,
      wallet: address,
      walletBound: true,
    }));
  }, [setContribution]);

  const handleContribute = useCallback(async () => {
    if (!contribution.walletBound || !contribution.wallet) return;

    const weight = getDeviceWeight(webgpuSnapshot.adapter, miSnapshot.cores, miSnapshot.memory);

    setContribution((prev) => ({
      ...prev,
      contributing: true,
      weight,
    }));
    await handleMiScan();
    await ensureModel(DEFAULT_LOCAL_MODEL);
    window.setTimeout(() => {
      void triggerRuntimeTask("infer");
    }, 900);
    window.setTimeout(() => {
      void triggerRuntimeTask("train");
    }, 1800);
  }, [contribution.wallet, contribution.walletBound, ensureModel, handleMiScan, miSnapshot.cores, miSnapshot.memory, setContribution, triggerRuntimeTask, webgpuSnapshot.adapter]);

  const handleDeleteSession = useCallback((id: string) => {
    const nextSessions = sessions.filter((item) => item.id !== id);
    setStoredState((prev) => {
      const nextMessages = { ...prev.messagesBySession };
      delete nextMessages[id];
      return {
        sessions: nextSessions,
        messagesBySession: nextMessages,
      };
    });
    setActiveSessionId(nextSessions[0]?.id || createSession());
  }, [createSession, sessions, setStoredState]);

  if (!session) return null;

  return (
    <main className="console-page min-h-screen bg-black text-white">
      <div className={`console-grid console-hub-grid ${chatMode ? "console-grid-chat-mode" : ""}`}>
        {!chatMode && (
          <ConsoleSidebar
            activeSessionId={activeSessionId}
            onCreateSession={() => createSession()}
            onDeleteSession={handleDeleteSession}
            onSelectSession={setActiveSessionId}
            sessions={sessions}
          />
        )}

        <section className={`console-main console-main-hub ${chatMode ? "console-main-chat-mode" : ""}`}>
          <ConsoleTopbar
            chatMode={chatMode}
            onSignOut={() => void signOut({ callbackUrl: "/" })}
            userEmail={userEmail}
            userImage={userImage}
            userName={userName}
          />

          <div className="deck-grid deck-grid-hub deck-grid-hub-stack deck-grid-hub-float">
            {!chatMode && (
              <ControlTower
                contribution={contribution}
                localModelReady={localModel.ready}
                localModelStatus={localModel.status}
                miScanning={miScanning}
                miSnapshot={miSnapshot}
                modelSnapshot={modelSnapshot}
                onBindWallet={handleBindWallet}
                onContribute={() => void handleContribute()}
                runtimeSnapshot={runtimeSnapshot}
                selectedModel={DEFAULT_LOCAL_MODEL}
                webgpuSnapshot={webgpuSnapshot}
              />
            )}

            <ChatPanel
              chatMode={chatMode}
              feed={feed}
              loading={loading}
              onPromptChange={setPrompt}
              lockReason={lockReason}
              onPromptSubmit={() => void sendMessage()}
              onQuickCommand={(command) => void sendMessage(command)}
              prompt={prompt}
              quickCommands={quickCommands}
              remainingMessages={remainingMessageCount}
              streamingId={streamingId}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
