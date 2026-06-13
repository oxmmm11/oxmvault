import type { SessionItem } from "./types";

type ConsoleSidebarProps = {
  activeSessionId: string;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  onSelectSession: (id: string) => void;
  sessions: SessionItem[];
};

export function ConsoleSidebar({
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onSelectSession,
  sessions,
}: ConsoleSidebarProps) {
  return (
    <aside className="console-sidebar console-sidebar-hub">
      <div className="console-brand-row">
        <div className="console-brand">OXMVault</div>
        <button type="button" className="console-new" onClick={onCreateSession}>
          New
        </button>
      </div>
      <div className="console-side-kicker">Sessions</div>
      <div className="session-list">
        {sessions.map((item) => (
          <div key={item.id} className={`session-tile ${activeSessionId === item.id ? "session-tile-active" : ""}`}>
            <button type="button" onClick={() => onSelectSession(item.id)} className="session-tile-main">
              <span className="session-title">{item.title}</span>
              <span className="session-time">{item.updatedAt}</span>
            </button>
            <button type="button" className="session-delete" onClick={() => onDeleteSession(item.id)}>
              x
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
