import { useState, useEffect } from "preact/hooks";
import s from "./UserAvatar.module.css";
import {
  avatarUrl as defaultAvatarUrl,
  overlayUrl as defaultOverlayUrl,
  isCrackedAccount,
} from "../lib/avatar";

interface UserAvatarProps {
  username: string;
  pfp?: string;
  overlayUrl?: string;
  size?: number;
  className?: string;
  alt?: string;
  showOverlay?: boolean;
}

function getInitials(name: string): string {
  const base = name.replace(/^USR:/, "");
  return base.substring(0, 2).toUpperCase();
}

export function UserAvatar({
  username,
  pfp,
  overlayUrl,
  size,
  className,
  alt,
  showOverlay = true,
}: UserAvatarProps) {
  const [pfpFailed, setPfpFailed] = useState(false);
  const [overlayFailed, setOverlayFailed] = useState(false);
  const [pfpBust, setPfpBust] = useState(0);

  useEffect(() => {
    setPfpFailed(false);
    setOverlayFailed(false);
    setPfpBust(0);
  }, [username, pfp]);

  const isCracked = isCrackedAccount(username);
  const initials = getInitials(username);

  const wrapperStyle: Record<string, string | number> = {};
  if (size) {
    wrapperStyle.width = `${size}px`;
    wrapperStyle.height = `${size}px`;
  }

  const initialsStyle: Record<string, string | number> = {
    alignItems: "center",
    background: "var(--surface-3, #2a2a2a)",
    borderRadius: "50%",
    display: "flex",
    flexShrink: 0,
    fontWeight: 500,
    justifyContent: "center",
    textTransform: "uppercase",
    userSelect: "none",
    width: "100%",
    height: "100%",
    fontSize: size ? `${size * 0.45}px` : "1.5rem",
    color: "var(--text, #fff)",
  };

  if (isCracked && !pfp) {
    return (
      <div class={`${className || ""} ${s.wrapper}`} style={wrapperStyle}>
        <span class={s.avatar} style={initialsStyle}>
          {initials}
        </span>
      </div>
    );
  }

  let src: string;
  if (pfp) {
    if (/^https?:\/\//i.test(pfp)) {
      src =
        pfpBust > 0
          ? `${pfp}${pfp.includes("?") ? "&" : "?"}v=${pfpBust}`
          : pfp;
    } else {
      const stripped = pfp.replace(/^\/+/, "");
      const full = `https://avatars.accounts.bilup.org/${stripped}`;
      src = pfpBust > 0 ? `${full}?v=${pfpBust}` : full;
    }
  } else {
    src = defaultAvatarUrl(username);
  }

  if (pfpFailed) {
    return (
      <div class={`${className || ""} ${s.wrapper}`} style={wrapperStyle}>
        <span class={s.avatar} style={initialsStyle}>
          {initials}
        </span>
      </div>
    );
  }

  const finalOverlayUrl = overlayUrl || defaultOverlayUrl(username);

  return (
    <div class={`${className || ""} ${s.wrapper}`} style={wrapperStyle}>
      <img
        src={src}
        loading="lazy"
        alt={alt || username}
        class={s.avatar}
        onError={() => {
          if (!pfp) setPfpFailed(true);
          else if (pfpBust === 0) setPfpBust(Date.now());
          else setPfpFailed(true);
        }}
      />
      {showOverlay && !isCracked && !overlayFailed && (
        <img
          src={finalOverlayUrl}
          loading="lazy"
          alt=""
          class={s.overlay}
          onError={() => setOverlayFailed(true)}
        />
      )}
    </div>
  );
}
