import { useState, useMemo, useCallback, useEffect } from "preact/hooks";
import { Search, ArrowRight, UserX } from "lucide-preact";
import { AccountPage } from "../components/AccountPage";
import { ProfileCard } from "../components/ProfileCard";
import { useAuth, usePublicProfile, useBenefits } from "../lib/auth";
import { useI18n } from "../i18n/i18n";
import s from "./Profile.module.css";

const API = "https://api.accounts.bilup.org";

export function Profile(props: { matches?: { username?: string } }) {
  const username = props.matches?.username || getUsernameFromUrl();

  if (!username) {
    return <ProfileLookup />;
  }
  return <ProfileView username={username} />;
}

function getUsernameFromUrl(): string {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("profile");
  if (idx >= 0 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
  return "";
}

function ProfileLookup() {
  const [input, setInput] = useState("");
  const { t } = useI18n();

  const onSubmit = (e: Event) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    window.location.href = `/profile/${encodeURIComponent(v)}`;
  };

  return (
    <AccountPage>
      <div class={s.lookup}>
        <div class={s.lookupIcon}>
          <Search size={28} />
        </div>
        <div class={s.lookupTitle}>{t("profile.lookupTitle")}</div>
        <p class={s.lookupText}>
          {t("profile.lookupText")}
        </p>
        <form class={s.lookupForm} onSubmit={onSubmit}>
          <input
            type="text"
            class={s.lookupInput}
            placeholder={t("profile.lookupPlaceholder")}
            value={input}
            onInput={(e: any) => setInput(e.target.value)}
            autoFocus
          />
          <button class={s.lookupBtn} type="submit" disabled={!input.trim()}>
            {t("profile.lookupView")} <ArrowRight size={14} />
          </button>
        </form>
        <div class={s.lookupHint}>
          {t("profile.lookupHint")} <code>/profile/username</code>
        </div>
      </div>
    </AccountPage>
  );
}

function ProfileView({ username }: { username: string }) {
  const { profile, loading, error } = usePublicProfile(username);
  const { user: me, token, reload } = useAuth();
  const { benefits } = useBenefits();
  const [isFollowing, setIsFollowing] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { t } = useI18n();

  const isSelf = !!me && me.username?.toLowerCase() === username.toLowerCase();

  const viewerNotes = useMemo(() => me?.["sys.notes"] || {}, [me]);

  const friendState = useMemo<"self" | "friend" | "pending" | "none">(() => {
    if (isSelf) return "self";
    if (!me) return "none";
    const lower = username.toLowerCase();
    if (
      (me["sys.friends"] || [])
        .map((u: string) => u.toLowerCase())
        .includes(lower)
    )
      return "friend";
    if (
      (me["sys.requests"] || [])
        .map((u: string) => u.toLowerCase())
        .includes(lower)
    )
      return "pending";
    return "none";
  }, [me, isSelf, username]);

  const isBlocked = useMemo(() => {
    if (!me || isSelf) return false;
    const lower = username.toLowerCase();
    return (me["sys.blocked"] || [])
      .map((u: string) => u.toLowerCase())
      .includes(lower);
  }, [me, isSelf, username]);

  useEffect(() => {
    if (profile?.followed_by_you !== undefined) {
      setIsFollowing(profile.followed_by_you);
    }
  }, [profile?.followed_by_you]);

  const onFollowToggle = useCallback(async () => {
    // Without this guard, rapid clicks interleave follow/unfollow requests
    // against the optimistic local state and can settle on the wrong value.
    if (!token || isSelf || actionBusy) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setActionError(null);
    setActionBusy(true);
    const endpoint = wasFollowing ? "unfollow" : "follow";
    const param = wasFollowing ? "username" : "name";
    try {
      const res = await fetch(
        `${API}/${endpoint}?auth=${encodeURIComponent(token)}&${param}=${encodeURIComponent(username)}`,
      );
      if (!res.ok) {
        setIsFollowing(wasFollowing);
        const data = await res.json().catch(() => ({}));
        setActionError(
          data?.error ||
            `Couldn't ${wasFollowing ? "unfollow" : "follow"} @${username}.`,
        );
      }
    } catch {
      setIsFollowing(wasFollowing);
      setActionError("Network error — please try again.");
    } finally {
      setActionBusy(false);
    }
  }, [token, username, isSelf, isFollowing, actionBusy]);

  const onFriendAction = useCallback(
    async (action: "add" | "remove" | "accept" | "reject") => {
      if (!token || actionBusy) return;
      const endpoint = action === "add" ? "request" : action;
      setActionError(null);
      setActionBusy(true);
      try {
        const res = await fetch(
          `${API}/friends/${endpoint}/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.error) {
          setActionError(data?.error || `Couldn't ${action} @${username}.`);
          return;
        }
        await reload();
      } catch {
        setActionError("Network error — please try again.");
      } finally {
        setActionBusy(false);
      }
    },
    [token, username, reload, actionBusy],
  );

  const onBlockToggle = useCallback(async () => {
    if (!token || isSelf || actionBusy) return;
    const wasBlocked = isBlocked;
    const endpoint = wasBlocked ? "unblock" : "block";
    setActionError(null);
    setActionBusy(true);
    try {
      const res = await fetch(
        `${API}/me/${endpoint}/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      if (res.ok) {
        await reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(
          data?.error ||
            `Couldn't ${wasBlocked ? "unblock" : "block"} @${username}.`,
        );
      }
    } catch {
      setActionError("Network error — please try again.");
    } finally {
      setActionBusy(false);
    }
  }, [token, username, isSelf, isBlocked, reload, actionBusy]);

  const onNoteUpdate = useCallback(
    async (noteUsername: string, note: string) => {
      if (!token) return;
      setActionError(null);
      try {
        const res = note
          ? await fetch(
              `${API}/me/note/${encodeURIComponent(noteUsername)}?auth=${encodeURIComponent(token)}&note=${encodeURIComponent(note)}`,
              { method: "POST" },
            )
          : await fetch(
              `${API}/me/note/${encodeURIComponent(noteUsername)}?auth=${encodeURIComponent(token)}`,
              { method: "DELETE" },
            );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setActionError(data?.error || "Couldn't save your note.");
          return;
        }
        await reload();
      } catch {
        setActionError("Network error — your note was not saved.");
      }
    },
    [token, reload],
  );

  if (profile?.["sys.banned"]) {
    return (
      <AccountPage>
        <div class={s.errorState}>
          <div class={s.errorIcon}>
            <UserX size={28} />
          </div>
          <div class={s.errorTitle}>{t("profile.bannedTitle")}</div>
          <p class={s.errorText}>{t("profile.bannedText")}</p>
          <a
            href="/profile"
            class={s.lookupBtn}
            style={{ display: "inline-flex" }}
          >
            <Search size={14} /> {t("profile.lookUpAnother")}
          </a>
        </div>
      </AccountPage>
    );
  }

  return (
    <AccountPage>
      {loading ? (
        <div class={s.spinner} aria-label={t("profile.loading")} />
      ) : !profile || error === "not_found" ? (
        <div class={s.errorState}>
          <div class={s.errorIcon}>
            <UserX size={28} />
          </div>
          <div class={s.errorTitle}>{t("profile.notFoundTitle")}</div>
          <p class={s.errorText}>
            {t("profile.notFoundText")} <strong>@{username}</strong>.
          </p>
          <a
            href="/profile"
            class={s.lookupBtn}
            style={{ display: "inline-flex" }}
          >
            <Search size={14} /> {t("profile.lookUpAnother")}
          </a>
        </div>
      ) : (
        <ProfileCard
          user={profile}
          editable={false}
          isSelf={isSelf}
          isFollowing={isFollowing}
          isBlocked={isBlocked}
          friendState={friendState}
          viewerBalance={me ? (me["sys.currency"] ?? 0) : null}
          benefits={benefits?.benefits ?? null}
          viewerNotes={viewerNotes}
          actionError={actionError}
          onFollowToggle={onFollowToggle}
          onFriendAction={onFriendAction}
          onBlockToggle={onBlockToggle}
          onNoteUpdate={onNoteUpdate}
          onTransferComplete={() => {
            reload();
          }}
        />
      )}
    </AccountPage>
  );
}
