import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `You are OXMVault Mesh.
Speak with a clear, direct operator tone.
If asked what model is active, answer with the current route only: core line before contribution, local line after contribution.`;

const REQUEST_TIMEOUT_MS = 30_000;

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function POST(request: NextRequest) {
  try {
    const { message, model: requestedModel, usePulledModel } = (await request.json()) as {
      message?: string;
      model?: string;
      usePulledModel?: boolean;
    };
    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const apiKey =
      process.env.FREEMODEL_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OPENAI_APIKEY ||
      "";

    const configuredBaseUrl = process.env.OPENAI_BASE_URL || process.env.FREEMODEL_BASE_URL;
    const baseUrl = (configuredBaseUrl || "https://api.freemodel.dev/v1").replace(/\/$/, "");
    const defaultModel = process.env.OPENAI_MODEL || process.env.FREEMODEL_MODEL || "gpt-4.1";
    const model = usePulledModel && requestedModel ? requestedModel : defaultModel;

    if (!apiKey) {
      return NextResponse.json(
        {
          reply: "Core line is offline. Add FREEMODEL_API_KEY or OPENAI_API_KEY.",
        },
        { status: 200 },
      );
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: trimmedMessage },
          ],
          temperature: 0.7,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text || "Upstream API error" }, { status: 500 });
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const reply = data.choices?.[0]?.message?.content?.trim() || "No line returned.";

      return NextResponse.json({ reply });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const status = error instanceof Error && error.name === "AbortError" ? 504 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
