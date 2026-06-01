import { useState, useMemo, useCallback, useEffect } from "preact/hooks";
import { Search, ArrowRight, UserX } from "lucide-preact";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ProfileCard } from "../components/ProfileCard";
import { useAuth, usePublicProfile } from "../lib/auth";
import s from "./Profile.module.css";

const API = "https://api.rotur.dev";

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

  const onSubmit = (e: Event) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    window.location.href = `/profile/${encodeURIComponent(v)}`;
  };

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
          <div class={s.lookup}>
            <div class={s.lookupIcon}>
              <Search size={28} />
            </div>
            <div class={s.lookupTitle}>Look up a Rotur user</div>
            <p class={s.lookupText}>
              Enter a username to view their public profile.
            </p>
            <form class={s.lookupForm} onSubmit={onSubmit}>
              <input
                type="text"
                class={s.lookupInput}
                placeholder="username"
                value={input}
                onInput={(e: any) => setInput(e.target.value)}
                autoFocus
              />
              <button
                class={s.lookupBtn}
                type="submit"
                disabled={!input.trim()}
              >
                View <ArrowRight size={14} />
              </button>
            </form>
            <div class={s.lookupHint}>
              You can also go directly to <code>/profile/username</code>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function ProfileView({ username }: { username: string }) {
  const { profile, loading, error } = usePublicProfile(username);
  const { user: me, token, reload } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  const isSelf = !!me && me.username?.toLowerCase() === username.toLowerCase();

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

  useEffect(() => {
    if (profile?.followed_by_you !== undefined) {
      setIsFollowing(profile.followed_by_you);
    }
  }, [profile?.followed_by_you]);

  const onFollowToggle = useCallback(async () => {
    if (!token || isSelf) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    const endpoint = wasFollowing ? "unfollow" : "follow";
    const param = wasFollowing ? "username" : "name";
    try {
      const res = await fetch(
        `${API}/${endpoint}?auth=${encodeURIComponent(token)}&${param}=${encodeURIComponent(username)}`,
      );
      if (!res.ok) setIsFollowing(wasFollowing);
    } catch {
      setIsFollowing(wasFollowing);
    }
  }, [token, username, isSelf, isFollowing]);

  const onFriendAction = useCallback(
    async (action: "add" | "remove" | "accept" | "reject") => {
      if (!token) return;
      const endpoint = action === "add" ? "request" : action;
      try {
        await fetch(
          `${API}/friends/${endpoint}/${encodeURIComponent(username)}?auth=${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        await reload();
      } catch {
        /* ignore */
      }
    },
    [token, username, reload],
  );

  if (profile?.["sys.banned"]) {
    return (
      <div>
        <Header />
        <div class={s.page}>
          <div class={s.layout}>
            <div class={s.errorState}>
              <div class={s.errorIcon}>
                <UserX size={28} />
              </div>
              <div class={s.errorTitle}>This user has been banned</div>
              <p class={s.errorText}>
                This Rotur account is no longer available.
              </p>
              <a
                href="/profile"
                class={s.lookupBtn}
                style={{ display: "inline-flex" }}
              >
                <Search size={14} /> Look up another
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div class={s.page}>
        <div class={s.layout}>
          {loading ? (
            <div class={s.spinner} aria-label="Loading" />
          ) : !profile || error === "not_found" ? (
            <div class={s.errorState}>
              <div class={s.errorIcon}>
                <UserX size={28} />
              </div>
              <div class={s.errorTitle}>User not found</div>
              <p class={s.errorText}>
                We couldn't find a Rotur user named <strong>@{username}</strong>
                .
              </p>
              <a
                href="/profile"
                class={s.lookupBtn}
                style={{ display: "inline-flex" }}
              >
                <Search size={14} /> Look up another
              </a>
            </div>
          ) : (
            <ProfileCard
              user={profile}
              editable={false}
              isSelf={isSelf}
              isFollowing={isFollowing}
              friendState={friendState}
              viewerBalance={me ? (me["sys.currency"] ?? 0) : null}
              onFollowToggle={onFollowToggle}
              onFriendAction={onFriendAction}
              onTransferComplete={() => {
                reload();
              }}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
