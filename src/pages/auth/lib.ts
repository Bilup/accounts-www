export const API = "https://api.accounts.bilup.org";

export interface AccountData {
  username: string;
  key?: string;
  token?: string;
  [key: string]: any;
}

export interface SavedAccount {
  username: string;
  lastUsed: number;
  avatar: string;
  token?: string;
}

export interface PermissionSchema {
  permissions: string[];
  groups: { name: string; description: string; permissions: string[] }[];
}

export interface SubToken {
  id: string;
  token?: string;
  name: string;
  permissions: string[];
  created_at: number;
  last_used_at?: number;
  expires_at?: number | null;
  revoked: boolean;
  revoked_at?: number | null;
  origin?: string;
  description?: string;
  websites?: string[];
}

export type View =
  | "welcome"
  | "signin"
  | "signup"
  | "verify"
  | "tos"
  | "permissions"
  | "forgot"
  | "reset"
  | "confirm";

export type BtnState = { text: string; disabled: boolean; color: string };

export const FORBIDDEN_PERMISSIONS = new Set([
  "tokens:manage",
  "account:delete",
]);

const AUTO_LOGIN_HOSTNAMES = new Set(["accounts.bilup.org"]);

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "account:delete": "Delete your account",
  "account:profile": "Edit your profile",
  "account:settings": "Change your account settings",
  "account:view": "View your profile",
  "blocked:manage": "Manage your blocked users",
  "blocked:view": "See who you've blocked",
  "cosmetics:buy": "Buy cosmetics for you",
  "cosmetics:equip": "Equip cosmetics on your profile",
  "cosmetics:view": "View your cosmetics",
  "credits:daily": "Claim your daily credits",
  "credits:manage": "Spend and manage your credits",
  "credits:transfer": "Transfer your credits",
  "credits:view": "View your credit balance",
  "files:delete": "Delete your files",
  "files:manage": "Upload and manage your files",
  "files:view": "View your files",
  "following:follow": "Follow people for you",
  "following:unfollow": "Unfollow people for you",
  "following:view": "See who you follow",
  "friends:accept": "Accept friend requests for you",
  "friends:cancel": "Cancel your friend requests",
  "friends:manage": "Manage your friends",
  "friends:remove": "Remove your friends",
  "friends:request": "Send friend requests for you",
  "friends:view": "View your friends list",
  "gifts:cancel": "Cancel your gifts",
  "gifts:claim": "Claim gifts for you",
  "gifts:create": "Create gifts on your behalf",
  "gifts:view": "View your gifts",
  "groups:ban": "Ban members from your groups",
  "groups:invite": "Manage your group invites",
  "groups:join": "Join groups for you",
  "groups:leave": "Leave groups for you",
  "groups:manage": "Manage your groups",
  "groups:members.view": "View members of your groups",
  "groups:view": "View your groups",
  "items:buy": "Buy marketplace items for you",
  "items:manage": "Manage your marketplace items",
  "items:sell": "Sell your marketplace items",
  "items:view": "View marketplace items",
  "keys:manage": "Manage your keys",
  "keys:view": "View your keys",
  "notifications:send": "Send notifications on your behalf",
  "notifications:view": "View your notifications",
  "posts:create": "Create posts for you",
  "posts:delete": "Delete your posts",
  "posts:like": "Like posts for you",
  "posts:manage": "Manage your posts",
  "posts:reply": "Reply to posts for you",
  "posts:repost": "Repost for you",
  "posts:view": "View posts",
  "tokens:manage": "Manage your access tokens",
  "validators:generate": "Generate validators for you",
};

const PERMISSION_CATEGORY_ICONS: Record<string, string> = {
  account: "fa-user",
  blocked: "fa-ban",
  cosmetics: "fa-palette",
  credits: "fa-coins",
  files: "fa-folder-open",
  following: "fa-user-plus",
  friends: "fa-user-group",
  gifts: "fa-gift",
  groups: "fa-users",
  items: "fa-store",
  keys: "fa-key",
  notifications: "fa-bell",
  posts: "fa-comment",
  tokens: "fa-key",
  validators: "fa-shield-halved",
};

export const sidebarForView: Record<View, { title: string; sub: string }> = {
  welcome: { title: "auth.sidebarChooseAccount", sub: "auth.sidebarContinueToBilup" },
  signin: { title: "auth.sidebarSignIn", sub: "auth.sidebarContinueToBilup" },
  signup: { title: "auth.sidebarCreateAccount", sub: "auth.sidebarJoinBilup" },
  verify: { title: "auth.sidebarVerifyEmail", sub: "auth.sidebarCheckInbox" },
  tos: { title: "auth.sidebarTOS", sub: "auth.sidebarTOSSub" },
  permissions: { title: "auth.sidebarAccountAccess", sub: "auth.sidebarChooseAccountAccess" },
  forgot: { title: "auth.sidebarResetPassword", sub: "auth.sidebarResetSub" },
  reset: { title: "auth.sidebarSetNewPassword", sub: "auth.sidebarSetNewSub" },
  confirm: { title: "auth.sidebarChooseAccount", sub: "auth.sidebarContinueToBilup" },
};

export function describePerm(p: string): string {
  if (PERMISSION_DESCRIPTIONS[p]) return PERMISSION_DESCRIPTIONS[p];
  const [ns, action = ""] = p.split(":");
  const verb = action.split(".")[0].replace(/_/g, " ");
  const noun = ns.replace(/_/g, " ");
  const phrase = `${verb} ${noun}`.trim();
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function permIcon(p: string): string {
  return PERMISSION_CATEGORY_ICONS[p.split(":")[0]] || "fa-shield-halved";
}

export function parseReturnUrl(url: string): URL | null {
  try {
    return new URL(url, location.origin);
  } catch {
    return null;
  }
}

export function getHostname(url: string): string {
  return parseReturnUrl(url)?.hostname.toLowerCase() || "";
}

export function normalizeHost(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return getHostname(v);
  return getHostname(`https://${v}`);
}

export function isRoturSubdomain(url: string): boolean {
  const host = getHostname(url).replace(/^www\./, "");
  return host === "accounts.bilup.org" || host.endsWith(".bilup.org");
}

export function isAutoLoginHost(url: string): boolean {
  const host = getHostname(url);
  if (!host) return false;
  if (isRoturSubdomain(url)) return true;
  if (AUTO_LOGIN_HOSTNAMES.has(host)) return true;
  return AUTO_LOGIN_HOSTNAMES.has(host.replace(/^www\./, ""));
}

export function isLocalhostHost(url: string): boolean {
  const host = getHostname(url);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost")
  );
}

export function returnUrl(url: string): URL {
  return parseReturnUrl(url) || new URL("https://accounts.bilup.org/me");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isTokenUsable(t: SubToken): boolean {
  if (t.revoked) return false;
  if (t.expires_at && t.expires_at < Date.now()) return false;
  if (!t.token) return false;
  return true;
}

export function tokenMatchesDomain(t: SubToken, returnTo: string): boolean {
  const host = getHostname(returnTo);
  if (!host) return false;
  const sources = [t.origin, ...(t.websites || [])].filter(Boolean) as string[];
  return sources.some((source) => normalizeHost(source) === host);
}

export const defaultBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "",
});
export const loadingBtn = (text: string): BtnState => ({
  text,
  disabled: true,
  color: "",
});
export const errorBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "var(--auth-danger, #f87171)",
});
export const successBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "var(--auth-success, #4ade80)",
});

export function loadSavedAccounts(): SavedAccount[] {
  try {
    const saved = localStorage.getItem("rotur_saved_accounts");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveAccountToStorage(data: AccountData) {
  try {
    let accounts = loadSavedAccounts();
    const existing = accounts.find((a) => a.username === data.username);
    accounts = accounts.filter((a) => a.username !== data.username);
    accounts.unshift({
      username: data.username,
      lastUsed: Date.now(),
      avatar: `https://avatars.accounts.bilup.org/${data.username}`,
      token: data.key || existing?.token,
    });
    accounts = accounts.slice(0, 5);
    localStorage.setItem("rotur_saved_accounts", JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

export function removeAccountFromStorage(username: string) {
  try {
    let accounts = loadSavedAccounts();
    accounts = accounts.filter((a) => a.username !== username);
    localStorage.setItem("rotur_saved_accounts", JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

export function setCookie(n: string, v: string, days: number) {
  const d = new Date(Date.now() + days * 864e5);
  document.cookie = `${n}=${encodeURIComponent(v)};expires=${d.toUTCString()};path=/;Secure;SameSite=Strict`;
}

export function getCookie(n: string): string {
  const m = document.cookie.match(new RegExp("(^| )" + n + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}

export async function requestAccount(username: string, password: string) {
  const res = await fetch(
    `${API}/get_user?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
  );
  const json = await res.json();
  if (json.error) {
    if (json.error.includes("Terms-Of-Service") && json.token)
      return {
        error: json.error,
        key: json.token,
        username,
        "sys.tos_accepted": false,
        requiresTOSAcceptance: true,
      } as any;
    if (json.error === "Email address not verified" && json.token)
      return {
        error: json.error,
        token: json.token,
        username: json.username,
        requiresEmailVerification: true,
      } as any;
    return { error: json.error };
  }
  return json;
}
