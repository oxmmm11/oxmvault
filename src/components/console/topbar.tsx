import Image from "next/image";

type ConsoleTopbarProps = {
  chatMode: boolean;
  onSignOut: () => void;
  userEmail: string;
  userImage: string;
  userName: string;
};

export function ConsoleTopbar({ chatMode, onSignOut, userEmail, userImage, userName }: ConsoleTopbarProps) {
  return (
    <div className="console-topbar console-topbar-hub">
      <div>
        <div className="console-kicker">Control</div>
        <div className="console-heading">{chatMode ? "Chat" : "Runtime Control"}</div>
      </div>
      <div className="console-user">
        {userImage ? (
          <Image src={userImage} alt={userName} width={44} height={44} className="console-avatar" unoptimized />
        ) : (
          <div className="console-avatar console-avatar-fallback">{userName.slice(0, 1)}</div>
        )}
        <div className="console-user-copy">
          <span>{userName}</span>
          <span>{userEmail}</span>
        </div>
        <button type="button" className="console-signout" onClick={onSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
