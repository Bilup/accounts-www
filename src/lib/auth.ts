import { useEffect, useState } from "preact/hooks";

export type Theme = {
  accent: string;
  background: string;
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
};

export type TimeFormat = {
  hours: "12h" | "24h";
  show_seconds: boolean;
};

export type Badge = {
  name: string;
  icon: string;
  description: string;
};

export type Backup = {
  id: string;
  name: string;
  size: number;
};

export type Login = {
  origin: string;
  userAgent: string;
  ip_hmac: string;
  country: string;
  timestamp: number;
  device_type: "Mobile" | "Desktop";
  message: string;
};

export type TransactionType =
  | "tax"
  | "in"
  | "out"
  | "cosmetic_purchase"
  | "cosmetic_sale"
  | "cosmetic_platform"
  | "key_sale"
  | "key_buy"
  | "gift_create"
  | "gift_claimed";

export type Transaction = {
  type: TransactionType;
  user: string;
  amount: number;
  note: string;
  time: number;
  new_total: number;
  key_name?: string;
  key_id?: string;
};

export type Presence = "online" | "idle" | "dnd" | "offline";

export type Status = {
  presence: Presence;
  status: string;
};

export type SubscriptionTier = "Free" | "Pro" | "Max";

export type Subscription = {
  active: boolean;
  next_billing: number;
  tier: SubscriptionTier;
};

export type SpotifyData = {
  access_token: string;
  connected: boolean;
  display_name: string;
  last_track_start: number;
  last_track_uri: string;
  refresh_token: string;
  show_activity: boolean;
  spotify_user_id: string;
  token_expiry: number;
};

export type NotifyLog = {
  at: number;
  body?: string;
  from: string;
  source: string;
  title: string;
};

export type WallpaperMode = "Fill" | "Fit" | "Stretch" | "Center";

export type RoturUser = {
  username: string;
  display_name: string;
  email: string;
  bio: string;
  pfp: string;
  banner: string;
  pronouns: string;
  identity: string;
  sexuality: string;
  nationality: string;
  language: string;
  birthday: string;
  age: string;
  relationship_status: "taken" | "single" | "complicated";
  private: boolean;

  created: number;
  last_login: number;
  discord_id: string;
  favorite_website: string;

  theme: Theme;
  timeformat: TimeFormat;
  timezone: string;
  wallpaper: string;
  wallpaper_mode: WallpaperMode;
  scrollspeed: number;
  dock_colour: string;
  icon_colour: string;

  system: string;
  hostOS: string;
  onboot: string[];
  origin_dock: string[];

  "sys.id": string;
  "sys.badges": Badge[];
  "sys.backups": (Backup | string)[];
  "sys.friends": string[];
  "sys.blocked": string[];
  "sys.requests": string[];
  "sys.currency": number;
  "sys.items": string[];
  "sys.purchases": string[];
  "sys.logins": Login[];
  "sys.total_logins": number;
  "sys.last_login": number;
  "sys.last_inactive": number;
  "sys.transactions": Transaction[];
  "sys.status": Status;
  "sys.status.presence": Presence;
  "sys.status.status": string;
  "sys.subscription": Subscription;
  "sys.spotify": SpotifyData;
  "sys.overlay": string;
  "sys.banner": string;
  "sys.banners": string[];
  "sys.notes": Record<string, string>;
  "sys.notify_log": NotifyLog[];
  "sys.notify_allowed": Record<string, Record<string, { count: number }>>;
  "sys.links": {
    github?: { id: number };
    [key: string]: unknown;
  };
  "sys.group": string;
  "sys.tos_accepted": boolean;
  "sys.tos_time": number;
  "sys.tos_version": string;
  "sys.enablebackups": string;

  origin_fav_friends: string[];
  banned_rotur_users: string;
  blocked_ips: string[];
  used_size: number;
  max_size: string;
  proxy: string;
};

export type AuthUser = RoturUser;

export type PublicBadge = {
  name: string;
  icon: string;
  description: string;
};

export type PublicActivity = {
  type?: string;
  [key: string]: unknown;
};

export type PublicStatus = {
  user_id: string;
  username: string;
  status: string;
  presence: Presence;
  activities: PublicActivity[];
};

export type PublicProfile = {
  username: string;
  discord_id: string;
  pfp: string;
  "sys.banned": boolean;
  private: boolean;
  bio: string;
  banner: string;
  followers: number;
  following: number;
  pronouns: string;
  system: string;
  created: number;
  badges: PublicBadge[];
  subscription: SubscriptionTier;
  max_size: string;
  currency: number;
  index: number;
  status: PublicStatus;
  theme: Theme;
  id: string;
  followed_by_you?: boolean;
  follows_you?: boolean;
};

const STORAGE_KEY = "rotur_token";
const API_BASE = "https://api.rotur.dev";

let currentUser: AuthUser | null = null;
let currentToken: string | null = null;
let loadingPromise: Promise<AuthUser | null> | null = null;
const listeners = new Set<(u: AuthUser | null) => void>();

function notify() {
  for (const l of listeners) l(currentUser);
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (currentToken !== null) return currentToken;
  const t = getStoredToken();
  currentToken = t;
  return t;
}

export function setToken(token: string | null) {
  currentToken = token;
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
  notify();
}

export function captureTokenFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    setToken(token);
    params.delete("token");
    const next = params.toString();
    const url =
      window.location.pathname +
      (next ? `?${next}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", url);
  }
}

async function fetchMe(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/me?auth=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as RoturUser;
    return data;
  } catch {
    return null;
  }
}

export async function loadUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) {
    currentUser = null;
    notify();
    return null;
  }
  if (loadingPromise) return loadingPromise;
  loadingPromise = fetchMe(token)
    .then((u) => {
      currentUser = u;
      loadingPromise = null;
      notify();
      return u;
    })
    .catch((e) => {
      loadingPromise = null;
      throw e;
    });
  return loadingPromise;
}

export async function refreshUser(): Promise<AuthUser | null> {
  return loadUser();
}

export function getUser(): AuthUser | null {
  return currentUser;
}

export function subscribe(fn: (u: AuthUser | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function logout() {
  setToken(null);
  currentUser = null;
  notify();
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(currentUser);
  const [token, setTokenState] = useState<string | null>(getToken());

  useEffect(() => {
    const unsub = subscribe((u) => {
      setUser(u);
      setTokenState(getToken());
    });
    if (!currentUser && getToken()) {
      loadUser();
    }
    return unsub;
  }, []);

  return {
    user,
    token,
    isLoggedIn: !!user,
    loading: !!token && !user,
    reload: loadUser,
    logout,
  };
}

export function useUser(username: string | null) {
  const [profile, setProfile] = useState<RoturUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!username);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const token = getToken();
    const authQs = token ? `&auth=${encodeURIComponent(token)}` : "";
    fetch(
      `${API_BASE}/get_user?username=${encodeURIComponent(username)}${authQs}`,
    )
      .then(async (r) => {
        if (!r.ok) throw new Error("not found");
        const data = (await r.json()) as RoturUser;
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  return { profile, loading };
}

export function usePublicProfile(username: string | null) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(!!username);
  const [error, setError] = useState<"not_found" | "network" | null>(null);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const token = getToken();
    const authQs = token ? `&auth=${encodeURIComponent(token)}` : "";
    fetch(
      `${API_BASE}/profile?name=${encodeURIComponent(username)}&include_posts=0${authQs}`,
    )
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) {
            setProfile(null);
            setError("not_found");
            setLoading(false);
          }
          return;
        }
        if (!r.ok) throw new Error("network");
        const data = (await r.json()) as PublicProfile;
        if (!cancelled) {
          setProfile(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setError("network");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  return { profile, loading, error };
}

export function avatarUrl(username: string): string {
  return `https://avatars.rotur.dev/${username}`;
}

export function bannerUrl(username: string): string {
  return `https://avatars.rotur.dev/.banners/${username}`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
