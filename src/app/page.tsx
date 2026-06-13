"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getCsrfToken } from "next-auth/react";
import { useNetworkStats } from "@/hooks/use-network-stats";

const rainColumns = [
  "01A1X0N0R1",
  "ZX10/\\/101",
  "M3SH_0001",
  "AI::SIGNAL",
  "110010101",
  "ROOT//GRID",
  "011110000",
  "NODE::RUN",
  "SIGMA-01",
  "QNTM/7777",
  "VOID::HEX",
  "TOK/TOK/T",
];

const LANDING_PROMPT_KEY = "oxmvault-landing-prompt";
const TOTAL_BLOCKS = 537600000;

function buildCallbackUrl(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  return new URL(pathname, window.location.origin).toString();
}

function buildPulsePath(values: number[], width: number, height: number) {
  if (!values.length) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function Home() {
  const [csrfToken, setCsrfToken] = useState("");
  const [prompt, setPrompt] = useState("");
  const [inputActive, setInputActive] = useState(false);
  const [consoleCallbackUrl] = useState(() => buildCallbackUrl("/console"));
  const [chatCallbackUrl] = useState(() => buildCallbackUrl("/console?mode=chat"));
  const networkStats = useNetworkStats();
  const googleConsoleFormRef = useRef<HTMLFormElement | null>(null);
  const googleChatFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    void getCsrfToken().then((token) => {
      if (token) {
        setCsrfToken(token);
      }
    });
  }, []);

  const blockSeries = useMemo(() => Array.from({ length: 32 }, (_, i) => 40 + Math.sin(i / 2.4) * 6 + (i % 7 === 0 ? 22 : 0)), []);
  const contributorSeries = useMemo(() => Array.from({ length: 32 }, (_, i) => 28 + Math.cos(i / 2.8) * 5 + (i % 9 === 0 ? 18 : 0)), []);
  const blockPath = useMemo(() => buildPulsePath(blockSeries, 640, 110), [blockSeries]);
  const contributorPath = useMemo(() => buildPulsePath(contributorSeries, 640, 110), [contributorSeries]);
  const blockPercent = ((networkStats.totalBlocks / TOTAL_BLOCKS) * 100).toFixed(4);

  function submitConsoleLogin() {
    if (!csrfToken || !googleConsoleFormRef.current) return;
    googleConsoleFormRef.current.submit();
  }

  function submitChatLogin() {
    if (!csrfToken || !googleChatFormRef.current) return;
    googleChatFormRef.current.submit();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) return;
    window.localStorage.setItem(LANDING_PROMPT_KEY, value);
    submitChatLogin();
  }

  return (
    <main className="matrix-page serpent-page min-h-screen overflow-hidden bg-black text-white">
      <form ref={googleConsoleFormRef} action="/api/auth/signin/google" method="post" className="hidden">
        <input name="csrfToken" value={csrfToken} readOnly />
        <input name="callbackUrl" value={consoleCallbackUrl} readOnly />
      </form>

      <form ref={googleChatFormRef} action="/api/auth/signin/google" method="post" className="hidden">
        <input name="csrfToken" value={csrfToken} readOnly />
        <input name="callbackUrl" value={chatCallbackUrl} readOnly />
      </form>

      <div className="matrix-rain" aria-hidden="true">
        {rainColumns.map((column, index) => (
          <span
            key={`${column}-${index}`}
            className="rain-col"
            style={{
              left: `${index * 8.2}%`,
              animationDelay: `${(index % 6) * -0.7}s`,
              animationDuration: `${5.5 + (index % 5) * 0.65}s`,
            }}
          >
            {column}<br />{column}<br />{column}<br />{column}<br />{column}
          </span>
        ))}
      </div>

      <div className="matrix-noise" />
      <div className="serpent-haze serpent-haze-a" />
      <div className="serpent-haze serpent-haze-b" />

      <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8">
        <div className="matrix-shell w-full max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.45em] text-emerald-400/70">OXMVault</p>
          </div>

          <div className="landing-heart-grid">
            <div className="serpent-stage mx-auto">
              <button type="button" onClick={submitConsoleLogin} className="matrix-core serpent-core" aria-label="Enter OXMVault dashboard">
                <div className="core-ring ring-a" />
                <div className="core-ring ring-b" />
                <div className="core-ring ring-c" />
                <div className="core-grid" />
                <div className="core-scan" />
                <div className="core-dot" />
              </button>

              <div className={`serpent-lair ${inputActive ? "serpent-lair-active" : ""}`}>
                <div className="serpent-arc serpent-arc-back" />
                <div className="serpent-arc serpent-arc-mid" />
                <div className="serpent-arc serpent-arc-front" />
                <div className="serpent-glow serpent-glow-a" />
                <div className="serpent-glow serpent-glow-b" />
                <div className="serpent-head-bottom">
                  <div className="serpent-eye-dot serpent-eye-dot-a" />
                  <div className="serpent-eye-dot serpent-eye-dot-b" />
                </div>

                <form onSubmit={handleSubmit} className="serpent-input-shell-bottom">
                  <div className="serpent-input-sheen" />
                  <div className="matrix-caret serpent-caret-bottom" />
                  <input
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onFocus={() => setInputActive(true)}
                    onBlur={() => setInputActive(false)}
                    className="serpent-input-bottom"
                    placeholder="Open a line"
                    aria-label="OXMVault command input"
                  />
                  <button type="submit" className="serpent-enter-btn-bottom" aria-label="Open OXMVault session" />
                </form>
              </div>
            </div>

            <aside className="landing-heart-card landing-heart-card-minimal">
              <div className="landing-heart-stats landing-heart-stats-minimal">
                <div className="landing-heart-stat">
                  <span>b</span>
                  <strong>{networkStats.totalBlocks.toFixed(4)}</strong>
                  <em>{blockPercent}%</em>
                </div>
                <div className="landing-heart-stat">
                  <span>n</span>
                  <strong>{networkStats.activeContributors.toLocaleString()}</strong>
                  <em>live</em>
                </div>
              </div>

              <div className="landing-heart-chart-shell landing-heart-chart-shell-tight">
                <svg viewBox="0 0 640 110" className="landing-heart-chart" aria-hidden="true">
                  <path d={blockPath} className="landing-heart-path landing-heart-path-blocks" />
                </svg>
              </div>

              <div className="landing-heart-chart-shell landing-heart-chart-shell-tight">
                <svg viewBox="0 0 640 110" className="landing-heart-chart" aria-hidden="true">
                  <path d={contributorPath} className="landing-heart-path landing-heart-path-contributors" />
                </svg>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
