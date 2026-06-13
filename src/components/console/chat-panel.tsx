import type { KeyboardEvent } from "react";
import type { Message } from "./types";

type ChatPanelProps = {
  chatMode: boolean;
  feed: Message[];
  loading: boolean;
  lockReason: string;
  onPromptChange: (value: string) => void;
  onPromptSubmit: () => void;
  prompt: string;
  quickCommands: string[];
  onQuickCommand: (command: string) => void;
  remainingMessages: string;
  streamingId: number | null;
};

export function ChatPanel({
  feed,
  loading,
  lockReason,
  onPromptChange,
  onPromptSubmit,
  prompt,
  remainingMessages,
  streamingId,
}: ChatPanelProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onPromptSubmit();
    }
  }

  return (
    <section className="hub-chat-wrap hub-chat-wrap-terminal">
      <div className="console-chat console-chat-hub console-chat-terminal">
        <div className="console-chat-rail" aria-hidden="true">
          <span className="console-rail-dot console-rail-dot-live" />
          <span className="console-rail-dot" />
          <span className="console-rail-dot" />
        </div>

        <div className="console-chat-meta console-chat-meta-terminal">
          <span className="console-meta-pill">line</span>
          <span className="console-meta-pill">room {remainingMessages}</span>
          <span className="console-meta-pill">{lockReason || (loading ? "busy" : "open")}</span>
        </div>

        <div className="console-history console-history-terminal">
          {feed.length === 0 ? (
            <div className="console-empty console-empty-terminal">
              <span className="console-empty-kicker">mesh</span>
              <strong>Channel open</strong>
              <span>Contribute to move this channel onto your local model.</span>
            </div>
          ) : (
            feed.map((message) => (
              <div key={message.id} className={`console-line ${message.role === "user" ? "console-line-user" : "console-line-mesh"} ${streamingId === message.id ? "console-line-streaming" : ""}`}>
                <span className="console-line-role">{message.role === "user" ? "user" : "mesh"}</span>
                <div className={`console-bubble console-bubble-terminal ${message.role === "user" ? "console-user-bubble" : "console-mesh-bubble"}`}>
                  <span className="console-bubble-prefix">{message.role === "user" ? ">" : "#"}</span>
                  <span className="console-bubble-text">{message.text}</span>
                  {streamingId === message.id && <span className="signal-bar signal-bar-terminal" />}
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onPromptSubmit();
          }}
          className="console-input-shell console-input-shell-hub"
        >
          <div className="console-input-prefix">$</div>
          <input
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={handleKeyDown}
            className="console-input"
            placeholder="Send a line"
          />
          <button type="submit" className="console-send" disabled={loading}>
            {loading ? "Hold" : "Send"}
          </button>
        </form>
      </div>
    </section>
  );
}
