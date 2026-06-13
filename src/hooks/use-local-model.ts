"use client";

import { useCallback, useRef, useState } from "react";

type LocalModelState = {
  activeModel: string;
  ready: boolean;
  loading: boolean;
  progress: number;
  status: string;
};

type EngineLike = {
  chat: {
    completions: {
      create: (request: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
      }) => Promise<{
        choices?: Array<{ message?: { content?: string } }>;
      }>;
    };
  };
};

export const DEFAULT_LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";

export function useLocalModel() {
  const engineRef = useRef<EngineLike | null>(null);
  const moduleRef = useRef<any>(null);
  const [state, setState] = useState<LocalModelState>({
    activeModel: DEFAULT_LOCAL_MODEL,
    ready: false,
    loading: false,
    progress: 0,
    status: "idle",
  });

  const ensureModel = useCallback(async (model: string) => {
    if (engineRef.current && state.ready && state.activeModel === model) {
      return;
    }

    setState((prev) => ({
      ...prev,
      activeModel: model,
      loading: true,
      ready: false,
      progress: 3,
      status: "loading local line",
    }));

    try {
      if (!moduleRef.current) {
        moduleRef.current = await import(/* webpackIgnore: true */ WEBLLM_CDN);
      }

      const webllm = moduleRef.current;
      const engine = await webllm.CreateMLCEngine(model, {
        initProgressCallback: (report: { progress?: number; text?: string }) => {
          setState((prev) => ({
            ...prev,
            activeModel: model,
            loading: true,
            ready: false,
            progress: Math.max(prev.progress, Math.round((report.progress || 0) * 100)),
            status: report.text || "loading local line",
          }));
        },
      });

      engineRef.current = engine;
      setState({
        activeModel: model,
        ready: true,
        loading: false,
        progress: 100,
        status: "local line ready",
      });
    } catch (error) {
      engineRef.current = null;
      setState({
        activeModel: model,
        ready: false,
        loading: false,
        progress: 0,
        status: error instanceof Error ? error.message : "local line failed",
      });
      throw error;
    }
  }, [state.activeModel, state.ready]);

  const generate = useCallback(async (prompt: string) => {
    if (!engineRef.current) {
      throw new Error("Local model not ready");
    }

    const response = await engineRef.current.chat.completions.create({
      messages: [
        { role: "system", content: "You are OXMVault local line. Reply clearly, briefly, and like a live operator console." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return response.choices?.[0]?.message?.content?.trim() || "No local reply returned.";
  }, []);

  return {
    localModel: state,
    ensureModel,
    generate,
  };
}
