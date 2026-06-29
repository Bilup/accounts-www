import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "preact/hooks";
import s from "./Auth.module.css";
import {
  AuthShell,
  AuthSidebar,
  AuthSidebarAction,
  AuthMain,
  AuthLogo,
  AuthHeading,
  AuthSubheading,
  AuthFormGroup,
  AuthInput,
  AuthBtnPrimary,
  AuthBtnSecondary,
  AuthTosLinks,
  AuthTosLinkBtn,
} from "./Shell";
import { UserAvatar } from "../../components/UserAvatar";
import { TosContent } from "../../components/TosContent";

declare const hcaptcha: any;

const API = "https://api.rotur.dev";

interface AccountData {
  username: string;
  key?: string;
  token?: string;
  [key: string]: any;
}

interface SavedAccount {
  username: string;
  lastUsed: number;
  avatar: string;
  token?: string;
}

interface PermissionSchema {
  permissions: string[];
  groups: { name: string; description: string; permissions: string[] }[];
}

interface SubToken {
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

const FORBIDDEN_PERMISSIONS = new Set(["tokens:manage", "account:delete"]);

const AUTO_LOGIN_HOSTNAMES = new Set(["rotur.dev", "originchats.com"]);

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

function describePerm(p: string): string {
  if (PERMISSION_DESCRIPTIONS[p]) return PERMISSION_DESCRIPTIONS[p];
  // Fallback: humanize "namespace:action" → "Action namespace"
  const [ns, action = ""] = p.split(":");
  const verb = action.split(".")[0].replace(/_/g, " ");
  const noun = ns.replace(/_/g, " ");
  const phrase = `${verb} ${noun}`.trim();
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

function permIcon(p: string): string {
  return PERMISSION_CATEGORY_ICONS[p.split(":")[0]] || "fa-shield-halved";
}

function parseReturnUrl(url: string): URL | null {
  try {
    return new URL(url, location.origin);
  } catch {
    return null;
  }
}

function isAutoLoginHost(url: string): boolean {
  const host = getHostname(url);
  if (!host) return false;
  if (isRoturSubdomain(url)) return true;
  if (AUTO_LOGIN_HOSTNAMES.has(host)) return true;
  return AUTO_LOGIN_HOSTNAMES.has(host.replace(/^www\./, ""));
}

function isRoturSubdomain(url: string): boolean {
  const host = getHostname(url).replace(/^www\./, "");
  return host === "rotur.dev" || host.endsWith(".rotur.dev");
}

function getHostname(url: string): string {
  return parseReturnUrl(url)?.hostname.toLowerCase() || "";
}

function returnUrl(url: string): URL {
  return parseReturnUrl(url) || new URL("https://rotur.dev/me");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isTokenUsable(t: SubToken): boolean {
  if (t.revoked) return false;
  if (t.expires_at && t.expires_at < Date.now()) return false;
  if (!t.token) return false;
  return true;
}

function tokenMatchesDomain(t: SubToken, returnTo: string): boolean {
  const host = getHostname(returnTo);
  if (!host) return false;
  if (t.origin && getHostname(t.origin) === host) return true;
  if (t.websites && t.websites.some((w) => getHostname(w) === host))
    return true;
  return false;
}

function findMatchingSubToken(
  tokens: SubToken[],
  returnTo: string,
): SubToken | null {
  return (
    tokens.find((t) => isTokenUsable(t) && tokenMatchesDomain(t, returnTo)) ||
    null
  );
}

type View =
  | "welcome"
  | "signin"
  | "signup"
  | "verify"
  | "tos"
  | "permissions"
  | "forgot"
  | "reset"
  | "confirm";
type BtnState = { text: string; disabled: boolean; color: string };

const defaultBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "",
});
const loadingBtn = (text: string): BtnState => ({
  text,
  disabled: true,
  color: "",
});
const errorBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "var(--auth-danger, #f87171)",
});
const successBtn = (text: string): BtnState => ({
  text,
  disabled: false,
  color: "var(--auth-success, #4ade80)",
});

function loadSavedAccounts(): SavedAccount[] {
  try {
    const saved = localStorage.getItem("rotur_saved_accounts");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveAccountToStorage(data: AccountData) {
  try {
    let accounts = loadSavedAccounts();
    const existing = accounts.find((a) => a.username === data.username);
    accounts = accounts.filter((a) => a.username !== data.username);
    accounts.unshift({
      username: data.username,
      lastUsed: Date.now(),
      avatar: `https://avatars.rotur.dev/${data.username}`,
      token: data.key || existing?.token,
    });
    accounts = accounts.slice(0, 5);
    localStorage.setItem("rotur_saved_accounts", JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

function removeAccountFromStorage(username: string) {
  try {
    let accounts = loadSavedAccounts();
    accounts = accounts.filter((a) => a.username !== username);
    localStorage.setItem("rotur_saved_accounts", JSON.stringify(accounts));
  } catch {
    /* ignore */
  }
}

function setCookie(n: string, v: string, days: number) {
  const d = new Date(Date.now() + days * 864e5);
  document.cookie = `${n}=${encodeURIComponent(v)};expires=${d.toUTCString()};path=/;Secure;SameSite=Strict`;
}

function getCookie(n: string): string {
  const m = document.cookie.match(new RegExp("(^| )" + n + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}

async function requestAccount(username: string, password: string) {
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

const sidebarForView: Record<View, { title: string; sub: string }> = {
  welcome: { title: "Choose an account", sub: "to continue to Rotur" },
  signin: { title: "Sign in", sub: "to continue to Rotur" },
  signup: { title: "Create account", sub: "Join Rotur today" },
  verify: { title: "Verify email", sub: "Check your inbox" },
  tos: { title: "Terms of Service", sub: "Review and accept to continue" },
  permissions: { title: "Account Access", sub: "Choose account to continue" },
  forgot: { title: "Reset password", sub: "We'll email you a link" },
  reset: { title: "Set new password", sub: "Enter the code from your email" },
  confirm: { title: "Choose an account", sub: "to continue to Rotur" },
};

export function Auth() {
  const [view, setView] = useState<View>("welcome");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siBtn, setSiBtn] = useState<BtnState>(defaultBtn("Sign in"));

  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suBtn, setSuBtn] = useState<BtnState>(defaultBtn("Create Account"));
  const captchaRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<string | null>(null);

  const [verifyMsg, setVerifyMsg] = useState("");

  const [tosBtn, setTosBtn] = useState<BtnState>(defaultBtn(""));
  const pendingTosRef = useRef<{
    token: string;
    username: string;
  } | null>(null);

  const [account, setAccount] = useState<AccountData | null>(null);
  const [quickLoginBusy, setQuickLoginBusy] = useState<string | null>(null);
  const [subTokens, setSubTokens] = useState<SubToken[]>([]);
  const [, setSubTokensLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBtn, setForgotBtn] = useState<BtnState>(
    defaultBtn("Send reset link"),
  );
  const [forgotMsg, setForgotMsg] = useState<string>("");

  const [resetToken, setResetToken] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBtn, setResetBtn] = useState<BtnState>(
    defaultBtn("Reset password"),
  );
  const [resetMsg, setResetMsg] = useState<string>("");

  // Scope-aware auth state
  const returnToRef = useRef<string>("https://rotur.dev/me");
  const systemNameRef = useRef<string>("rotur");
  const pendingVerificationRef = useRef<{
    token: string;
    username: string;
    email: string;
  } | null>(null);
  const requiredPermsRef = useRef<Set<string>>(new Set());
  const requiresFullRef = useRef(false);
  const defaultAllOnEntryRef = useRef(false);
  const pendingAutoLoginRef = useRef<{
    token: string;
    username: string;
  } | null>(null);

  // Permission picker state
  const [permSchema, setPermSchema] = useState<PermissionSchema | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [scopeBtn, setScopeBtn] = useState<BtnState>(defaultBtn("Continue"));
  const [scopeError, setScopeError] = useState("");
  const [useFullAccess, setUseFullAccess] = useState(false);

  const sidebar = useMemo(() => sidebarForView[view], [view]);
  const addBtnText = view === "welcome" ? "Use another account" : "Back";
  const addBtnIcon = view === "welcome" ? "fa-user-plus" : "fa-arrow-left";

  const requestor = useMemo(() => {
    return getHostname(returnToRef.current) || "This website";
  }, [returnToRef.current]);

  useEffect(() => {
    setSavedAccounts(loadSavedAccounts());

    const params = new URLSearchParams(location.search);
    const savedReturnTo = sessionStorage.getItem("rotur_return_to");
    returnToRef.current =
      params.get("return_to") ?? savedReturnTo ?? "https://rotur.dev/me";
    const systemParam = params.get("system");
    if (systemParam?.trim()) systemNameRef.current = systemParam.trim();
    sessionStorage.removeItem("rotur_return_to");

    const requiresParam = params.get("requires");
    if (requiresParam) {
      const parsed = new Set(
        requiresParam
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      );
      if (parsed.size > 0) requiredPermsRef.current = parsed;
      if (parsed.has("full")) {
        requiresFullRef.current = true;
      }
    }

    const tokenParam = params.get("token");
    if (tokenParam) {
      verifyTokenAndProceed(tokenParam);
      return;
    }

    const resetTokenParam = params.get("reset_token");
    if (resetTokenParam) {
      showReset(resetTokenParam);
      params.delete("reset_token");
      const next = params.toString();
      const url = location.pathname + (next ? `?${next}` : "") + location.hash;
      history.replaceState({}, "", url);
      return;
    }

    const stylesUrl = params.get("styles") || "./auth.css";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesUrl;
    document.head.appendChild(link);

    let storedToken: string | null = null;
    try {
      storedToken = localStorage.getItem("rotur_token");
    } catch {
      /* ignore */
    }

    const signupParam = params.get("signup");
    if (signupParam === "1" || signupParam === "true") {
      setView("signup");
    } else if (storedToken) {
      pendingAutoLoginRef.current = {
        token: storedToken,
        username: getCookie("username") || "",
      };
      setView("confirm");
    } else {
      const username = getCookie("username");
      if (username) {
        setSiUsername(username);
        setView("signin");
        requestAnimationFrame(() => {
          const pw = document.querySelector<HTMLInputElement>(
            'input[name="password"]',
          );
          pw?.focus();
        });
      }
    }

    // Pre-load permission schema (public endpoint)
    fetch(`${API}/tokens/permissions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.permissions)) {
          setPermSchema({
            permissions: data.permissions,
            groups: data.groups || [],
          });
        }
      })
      .catch(() => {
        /* ignore */
      });
    (window as any).handleCredential = (response: any) => {
      fetch(`${API}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: response.credential,
          system: systemNameRef.current,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            alert(data.error);
            return;
          }
          handleAccountLogin(data);
        });
    };
  }, []);

  const verifyTokenAndProceed = useCallback((token: string) => {
    const returnTo = returnToRef.current;
    if (window.opener || window.parent !== window) {
      if (window.opener) {
        window.opener.postMessage(
          { type: "rotur-auth-token", token, return_to: returnTo },
          "*",
        );
        setTimeout(() => window.close(), 300);
      } else {
        window.parent.postMessage(
          { type: "rotur-auth-token", token, return_to: returnTo },
          "*",
        );
      }
      return;
    }
    const finalUrl = returnUrl(returnTo);
    finalUrl.searchParams.set("token", token);
    location.href = finalUrl.toString();
  }, []);

  const checkTOSAcceptance = useCallback((data: AccountData): boolean => {
    if (`${data["sys.tos_accepted"]}` !== "true") {
      if (returnToRef.current)
        sessionStorage.setItem("rotur_return_to", returnToRef.current);
      const url = new URL("/terms-of-service", location.origin);
      url.searchParams.set("token", data.key!);
      location.href = url.toString();
      return false;
    }
    return true;
  }, []);

  const handleAccountLogin = useCallback(
    (data: AccountData) => {
      if (!checkTOSAcceptance(data)) return;
      saveAccountToStorage(data);
      setSavedAccounts(loadSavedAccounts());
      if (isAutoLoginHost(returnToRef.current)) {
        if (window.opener)
          window.opener.postMessage(
            { type: "rotur-auth-token", token: data.key, scope: "full" },
            "*",
          );
        if (window.parent !== window)
          window.parent.postMessage(
            { type: "rotur-auth-token", token: data.key, scope: "full" },
            "*",
          );
        const ref = returnUrl(returnToRef.current);
        ref.searchParams.set("token", data.key!);
        location.href = ref.toString();
        return;
      }
      setAccount(data);
      defaultAllOnEntryRef.current = isRoturSubdomain(returnToRef.current);
      if (defaultAllOnEntryRef.current) {
        setSelectedPerms(new Set());
      } else {
        setSelectedPerms(new Set(requiredPermsRef.current));
      }
      setUseFullAccess(requiresFullRef.current);
      setScopeError("");
      setView("permissions");
    },
    [checkTOSAcceptance],
  );

  const fetchSubTokens = useCallback(async (authKey: string) => {
    setSubTokensLoading(true);
    try {
      const res = await fetch(
        `${API}/tokens?auth=${encodeURIComponent(authKey)}`,
      );
      if (!res.ok) {
        setSubTokens([]);
        return;
      }
      const data = await res.json();
      const tokens: SubToken[] = Array.isArray(data?.tokens) ? data.tokens : [];
      setSubTokens(tokens);
      return tokens;
    } catch {
      setSubTokens([]);
      return [];
    } finally {
      setSubTokensLoading(false);
    }
  }, []);

  const useSubTokenAndRedirect = useCallback(
    (sub: SubToken, scope: "scoped" | "existing" = "existing") => {
      if (!sub.token) return;
      const payload = {
        type: "rotur-auth-token",
        token: sub.token,
        scope,
        permissions: sub.permissions,
        id: sub.id,
      };
      if (window.opener) window.opener.postMessage(payload, "*");
      if (window.parent !== window) window.parent.postMessage(payload, "*");
      const ref = returnUrl(returnToRef.current);
      ref.searchParams.set("token", sub.token);
      location.href = ref.toString();
    },
    [],
  );

  const tryAutoUseSubToken = useCallback(
    (tokens: SubToken[]) => {
      const match = findMatchingSubToken(tokens, returnToRef.current);
      if (match) {
        useSubTokenAndRedirect(match, "existing");
        return true;
      }
      return false;
    },
    [useSubTokenAndRedirect],
  );

  const flashBtn = (
    setter: (b: BtnState) => void,
    original: string,
    btn: BtnState,
    ms = 2000,
  ) => {
    setter(btn);
    setTimeout(() => setter(defaultBtn(original)), ms);
  };

  const showSignInForm = useCallback((prefillUsername = "") => {
    setView("signin");
    if (prefillUsername) setSiUsername(prefillUsername);
    else setSiUsername(getCookie("username") || "");
    setSiPassword("");
    setSiBtn(defaultBtn("Sign in"));
  }, []);

  const showSignUpForm = useCallback(() => {
    setView("signup");
    setSuUsername("");
    setSuEmail("");
    setSuPassword("");
    setSuConfirm("");
    setSuBtn(defaultBtn("Create Account"));
  }, []);

  const showWelcome = useCallback(() => {
    setView("welcome");
  }, []);

  const showForgot = useCallback(() => {
    setView("forgot");
    setForgotEmail(getCookie("username") || "");
    setForgotMsg("");
    setForgotBtn(defaultBtn("Send reset link"));
  }, []);

  const showReset = useCallback((prefillToken = "") => {
    setView("reset");
    setResetToken(prefillToken);
    setResetNewPw("");
    setResetConfirm("");
    setResetMsg("");
    setResetBtn(defaultBtn("Reset password"));
  }, []);

  const handleForgotSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const email = forgotEmail.trim();
      if (!email || !isValidEmail(email)) {
        flashBtn(
          setForgotBtn,
          "Send reset link",
          errorBtn("A valid email address is required"),
        );
        return;
      }
      setForgotMsg("");
      setForgotBtn(loadingBtn("Sending..."));
      try {
        const res = await fetch(`${API}/auth/request_reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}) as any);
        if (res.status === 429) {
          flashBtn(
            setForgotBtn,
            "Send reset link",
            errorBtn(
              data.error || "Please wait before requesting another reset",
            ),
          );
          return;
        }
        setForgotBtn(
          successBtn("If an account exists, an email is on its way"),
        );
        setForgotMsg(
          data.message ||
            "If an account with that email exists, a reset link has been sent.",
        );
      } catch {
        setForgotBtn(
          successBtn("If an account exists, an email is on its way"),
        );
        setForgotMsg(
          "If an account with that email exists, a reset link has been sent.",
        );
      }
    },
    [forgotEmail],
  );

  const handleResetSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const token = resetToken.trim();
      if (!token) {
        flashBtn(
          setResetBtn,
          "Reset password",
          errorBtn("Reset code is required"),
        );
        setResetMsg("Reset code is required");
        return;
      }
      if (resetNewPw.length < 8) {
        flashBtn(
          setResetBtn,
          "Reset password",
          errorBtn("Password must be 8+ characters"),
        );
        setResetMsg("Password must be at least 8 characters.");
        return;
      }
      if (resetNewPw !== resetConfirm) {
        flashBtn(
          setResetBtn,
          "Reset password",
          errorBtn("Passwords do not match"),
        );
        setResetMsg("Passwords do not match.");
        return;
      }
      setResetMsg("");
      setResetBtn(loadingBtn("Resetting..."));
      try {
        const res = await fetch(`${API}/auth/reset_password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            new_password: resetNewPw,
          }),
        });
        const data = await res.json().catch(() => ({}) as any);
        if (!res.ok) {
          flashBtn(
            setResetBtn,
            "Reset password",
            errorBtn(data.error || "Failed to reset password"),
          );
          setResetMsg(data.error || "Failed to reset password");
          return;
        }
        setResetBtn(successBtn("Password reset!"));
        setResetMsg(
          data.message || "Your password has been reset. Please sign in.",
        );
        setTimeout(() => {
          setSiUsername(getCookie("username") || "");
          setSiPassword("");
          setSiBtn(defaultBtn("Sign in"));
          setView("signin");
        }, 1500);
      } catch {
        flashBtn(
          setResetBtn,
          "Reset password",
          errorBtn("Network error - try again"),
        );
        setResetMsg("Network error - try again");
      }
    },
    [resetToken, resetNewPw, resetConfirm],
  );

  const selectSavedAccount = useCallback(
    (username: string) => {
      showSignInForm(username);
      requestAnimationFrame(() => {
        const pw = document.querySelector<HTMLInputElement>(
          'input[name="password"]',
        );
        pw?.focus();
      });
    },
    [showSignInForm],
  );

  const quickLogin = useCallback(
    async (saved: SavedAccount) => {
      if (!saved.token) {
        selectSavedAccount(saved.username);
        return;
      }
      if (quickLoginBusy) return;
      setQuickLoginBusy(saved.username);

      try {
        const res = await fetch(
          `${API}/me?auth=${encodeURIComponent(saved.token)}`,
        );
        if (!res.ok) throw new Error("invalid");
        const data = (await res.json()) as AccountData;
        if (data.error) throw new Error("invalid");

        const hydrated: AccountData = {
          ...data,
          username: data.username || saved.username,
          key: saved.token,
        };
        saveAccountToStorage(hydrated);
        setSavedAccounts(loadSavedAccounts());
        setCookie("username", hydrated.username, 7);

        const inFrameOrPopup = !!window.opener || window.parent !== window;
        const isOwnDomain = isAutoLoginHost(returnToRef.current);

        if (!checkTOSAcceptance(hydrated)) return;

        if (!inFrameOrPopup && !isOwnDomain) {
          const tokens = await fetchSubTokens(saved.token);
          if (tokens && tryAutoUseSubToken(tokens)) return;
        }

        if (inFrameOrPopup) {
          handleAccountLogin(hydrated);
          return;
        }

        if (isOwnDomain) {
          try {
            localStorage.setItem("rotur_token", saved.token!);
          } catch {
            /* ignore */
          }
          const ref = returnUrl(returnToRef.current);
          ref.searchParams.set("token", saved.token!);
          location.href = ref.toString();
          return;
        }

        handleAccountLogin(hydrated);
      } catch {
        const next = loadSavedAccounts().map((a) =>
          a.username === saved.username ? { ...a, token: undefined } : a,
        );
        try {
          localStorage.setItem("rotur_saved_accounts", JSON.stringify(next));
        } catch {
          /* ignore */
        }
        setSavedAccounts(next);
        setQuickLoginBusy(null);
        showSignInForm(saved.username);
      }
    },
    [
      quickLoginBusy,
      selectSavedAccount,
      showSignInForm,
      checkTOSAcceptance,
      handleAccountLogin,
      fetchSubTokens,
      tryAutoUseSubToken,
    ],
  );

  // ── Sign in ──
  const handleSigninSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      setCookie("username", siUsername, 7);
      setSiBtn(loadingBtn("Signing in..."));

      try {
        const data = await requestAccount(siUsername, siPassword);
        if (!data.error) {
          handleAccountLogin(data);
        } else if ((data as any).requiresTOSAcceptance) {
          pendingTosRef.current = {
            token: (data as any).key,
            username: siUsername,
          };
          setTosBtn(defaultBtn(""));
          setTosAccepted(false);
          setTosScrolledToBottom(false);
          setTosCheckboxChecked(false);
          setView("tos");
          setSiBtn(defaultBtn("Sign in"));
        } else if ((data as any).requiresEmailVerification) {
          pendingVerificationRef.current = {
            token: (data as any).token,
            username: (data as any).username,
            email: (data as any).email || "",
          };
          setView("verify");
          setVerifyMsg("");
          setSiBtn(defaultBtn("Sign in"));
        } else {
          flashBtn(
            setSiBtn,
            "Sign in",
            errorBtn(data.error || "Invalid credentials"),
          );
        }
      } catch {
        flashBtn(setSiBtn, "Sign in", errorBtn("Error occurred"));
      }
    },
    [siUsername, siPassword, handleAccountLogin],
  );

  const handleSignupSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const htoken =
        typeof hcaptcha !== "undefined" ? hcaptcha.getResponse() : "";

      if (!htoken) {
        flashBtn(setSuBtn, "Create Account", errorBtn("Complete the captcha"));
        return;
      }
      if (suPassword !== suConfirm) {
        flashBtn(
          setSuBtn,
          "Create Account",
          errorBtn("Passwords do not match"),
        );
        if (typeof hcaptcha !== "undefined") hcaptcha.reset();
        return;
      }
      if (suPassword.length < 8) {
        flashBtn(
          setSuBtn,
          "Create Account",
          errorBtn("Password must be 8+ characters"),
        );
        if (typeof hcaptcha !== "undefined") hcaptcha.reset();
        return;
      }

      setSuBtn(loadingBtn("Creating..."));

      try {
        const res = await fetch(`${API}/create_user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: suUsername,
            email: suEmail,
            password: suPassword,
            system: systemNameRef.current,
            captcha: htoken,
          }),
        });
        const result = await res.json();

        if (result.error) {
          if (typeof hcaptcha !== "undefined") hcaptcha.reset();
          flashBtn(setSuBtn, "Create Account", errorBtn(result.error));
        } else {
          setCookie("username", suUsername, 7);
          const data = await requestAccount(suUsername, suPassword);
          if (!data.error) {
            handleAccountLogin(data);
          } else if ((data as any).requiresTOSAcceptance) {
            pendingTosRef.current = {
              token: (data as any).key,
              username: suUsername,
            };
            setTosBtn(defaultBtn(""));
            setTosAccepted(false);
            setTosScrolledToBottom(false);
            setTosCheckboxChecked(false);
            setView("tos");
            setSuBtn(defaultBtn("Create Account"));
          } else {
            flashBtn(
              setSuBtn,
              "Create Account",
              successBtn("Account created! Please sign in"),
            );
            setTimeout(() => {
              showSignInForm(suUsername);
              requestAnimationFrame(() => {
                const pw = document.querySelector<HTMLInputElement>(
                  'input[name="password"]',
                );
                pw?.focus();
              });
            }, 1500);
          }
        }
      } catch {
        if (typeof hcaptcha !== "undefined") hcaptcha.reset();
        flashBtn(setSuBtn, "Create Account", errorBtn("Error occurred"));
      }
    },
    [
      suUsername,
      suEmail,
      suPassword,
      suConfirm,
      handleAccountLogin,
      showSignInForm,
    ],
  );

  const handleVerifyDone = useCallback(async () => {
    const pending = pendingVerificationRef.current;
    if (!pending) return;
    try {
      const res = await fetch(`${API}/me?auth=${pending.token}`);
      const data = await res.json();
      if (data["sys.tos_accepted"] === false) {
        pendingVerificationRef.current = null;
        pendingTosRef.current = {
          token: pending.token,
          username: pending.username,
        };
        setTosBtn(defaultBtn(""));
        setTosAccepted(false);
        setTosScrolledToBottom(false);
        setTosCheckboxChecked(false);
        setView("tos");
      } else if (data["sys.email_verified"]) {
        handleAccountLogin(data);
        pendingVerificationRef.current = null;
      } else {
        setVerifyMsg("Email still not verified. Please check your inbox.");
      }
    } catch {
      setVerifyMsg("Error checking verification.");
    }
  }, [handleAccountLogin]);

  const handleVerifyResend = useCallback(async () => {
    const pending = pendingVerificationRef.current;
    if (!pending) return;
    try {
      const res = await fetch(
        `${API}/me/resend_verification?auth=${pending.token}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVerifyMsg(data.message || "Verification email sent.");
    } catch {
      setVerifyMsg("Failed to resend email.");
    }
  }, []);

  const handleVerifyCancel = useCallback(() => {
    pendingVerificationRef.current = null;
    setView("signin");
  }, []);

  const [tosAccepted, setTosAccepted] = useState(false);
  const [tosScrolledToBottom, setTosScrolledToBottom] = useState(false);
  const [tosCheckboxChecked, setTosCheckboxChecked] = useState(false);
  const tosContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (view !== "tos") return;
    const el = tosContentRef.current;
    if (!el) return;
    const check = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
        setTosScrolledToBottom(true);
      }
    };
    check();
    el.addEventListener("scroll", check);
    return () => el.removeEventListener("scroll", check);
  }, [view]);

  const handleTosContinue = useCallback(async () => {
    const pending = pendingTosRef.current;
    if (!pending) return;
    try {
      const res = await fetch(
        `${API}/me?auth=${encodeURIComponent(pending.token)}`,
      );
      const data = await res.json();
      if (data?.["sys.tos_accepted"] === true) {
        pendingTosRef.current = null;
        const account: AccountData = {
          ...data,
          username: data.username || pending.username,
          key: pending.token,
        };
        handleAccountLogin(account);
      } else {
        flashBtn(
          setTosBtn,
          "",
          errorBtn("Terms not accepted yet – read and click Accept below"),
        );
      }
    } catch {
      flashBtn(setTosBtn, "", errorBtn("Network error - try again"));
    }
  }, [handleAccountLogin]);

  const handleTosAccept = useCallback(async () => {
    const pending = pendingTosRef.current;
    if (!pending || !tosCheckboxChecked) return;
    setTosBtn(loadingBtn("Accepting…"));
    try {
      const res = await fetch(
        `${API}/accept_tos?auth=${encodeURIComponent(pending.token)}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (res.ok) {
        setTosAccepted(true);
        setTosBtn(successBtn("Accepted!"));
        setTimeout(() => handleTosContinue(), 800);
      } else {
        flashBtn(
          setTosBtn,
          "Accept Terms",
          errorBtn("Failed to accept – try again"),
        );
      }
    } catch {
      flashBtn(
        setTosBtn,
        "Accept Terms",
        errorBtn("Network error – try again"),
      );
    }
  }, [tosCheckboxChecked, handleTosContinue]);

  const handleAllowAccess = useCallback(() => {
    if (!account?.key) return;
    saveAccountToStorage(account);
    if (window.opener)
      window.opener.postMessage(
        { type: "rotur-auth-token", token: account.key, scope: "full" },
        "*",
      );
    if (window.parent !== window)
      window.parent.postMessage(
        { type: "rotur-auth-token", token: account.key, scope: "full" },
        "*",
      );
    const ref = returnUrl(returnToRef.current);
    ref.searchParams.set("token", account.key);
    location.href = ref.toString();
  }, [account]);

  const handleSwitchAccount = useCallback(() => {
    setAccount(null);
    setView("welcome");
  }, []);

  const handleCancelAccess = useCallback(() => {
    history.back();
  }, []);

  const handleConfirmContinue = useCallback(() => {
    const pending = pendingAutoLoginRef.current;
    if (!pending) {
      setView("welcome");
      return;
    }
    quickLogin({
      username: pending.username,
      lastUsed: Date.now(),
      avatar: `https://avatars.rotur.dev/${pending.username}`,
      token: pending.token,
    });
  }, [quickLogin]);

  const handleConfirmReject = useCallback(() => {
    pendingAutoLoginRef.current = null;
    setView("welcome");
  }, []);

  // Permission toggle helpers
  const togglePerm = useCallback((p: string) => {
    if (FORBIDDEN_PERMISSIONS.has(p)) return;
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const missingRequired = useMemo(() => {
    const missing: string[] = [];
    for (const r of requiredPermsRef.current) {
      if (!selectedPerms.has(r)) missing.push(r);
    }
    return missing;
  }, [selectedPerms]);

  const [showMissingWarn, setShowMissingWarn] = useState(false);

  const handleAllowScopedAccess = useCallback(
    async (permsOverride?: Set<string>) => {
      if (!account?.key) return;
      const perms = permsOverride ?? selectedPerms;
      if (perms.size === 0) {
        setScopeError(
          "Pick at least one permission, or use Full access above.",
        );
        return;
      }
      setScopeError("");
      setScopeBtn(loadingBtn("Creating token…"));
      try {
        const body: any = {
          name: requestor || "Third-party app",
          permissions: Array.from(perms),
          origin: requestor,
          description: `Scoped access for ${requestor}`,
          websites: [returnToRef.current],
        };
        const res = await fetch(
          `${API}/tokens/create?auth=${encodeURIComponent(account.key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setScopeBtn(errorBtn(data.error || "Failed to create token"));
          setTimeout(() => setScopeBtn(defaultBtn("Continue")), 3000);
          return;
        }
        const subToken: string = data.token;
        saveAccountToStorage(account);
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "rotur-auth-token",
              token: subToken,
              scope: "scoped",
              permissions: Array.from(perms),
              id: data.id,
            },
            "*",
          );
        }
        if (window.parent !== window) {
          window.parent.postMessage(
            {
              type: "rotur-auth-token",
              token: subToken,
              scope: "scoped",
              permissions: Array.from(perms),
              id: data.id,
            },
            "*",
          );
        }
        const ref = returnUrl(returnToRef.current);
        ref.searchParams.set("token", subToken);
        location.href = ref.toString();
      } catch (e: any) {
        setScopeBtn(errorBtn(e?.message || "Network error"));
        setTimeout(() => setScopeBtn(defaultBtn("Continue")), 3000);
      }
    },
    [account, selectedPerms, requestor],
  );

  const attemptSubmit = useCallback(() => {
    if (missingRequired.length > 0) {
      setShowMissingWarn(true);
      return;
    }
    handleAllowScopedAccess();
  }, [missingRequired, handleAllowScopedAccess]);

  const groupedVisible = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const p of permSchema?.permissions || []) {
      const cat = p.split(":")[0];
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [permSchema]);

  const requiredGrouped = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const all = permSchema?.permissions || [];
    for (const p of all) {
      if (!requiredPermsRef.current.has(p)) continue;
      const cat = p.split(":")[0];
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [permSchema]);

  const [showAllPerms, setShowAllPerms] = useState(false);
  const hasRequiredPerms = requiredPermsRef.current.size > 0;
  const showAllPermsEffective = showAllPerms || !hasRequiredPerms;
  const displayedGroups = showAllPermsEffective
    ? groupedVisible
    : requiredGrouped;

  const matchingSubTokens = useMemo(
    () =>
      subTokens.filter((t) => {
        if (!isTokenUsable(t) || !tokenMatchesDomain(t, returnToRef.current))
          return false;
        if (requiredPermsRef.current.size > 0) {
          for (const r of requiredPermsRef.current) {
            if (!t.permissions.includes(r)) return false;
          }
        }
        return true;
      }),
    [subTokens],
  );

  // Prune requested perms against the loaded schema (drop unknown/forbidden)
  useEffect(() => {
    if (!permSchema || requiredPermsRef.current.size === 0) return;
    let changed = false;
    for (const p of Array.from(requiredPermsRef.current)) {
      if (!permSchema.permissions.includes(p) || FORBIDDEN_PERMISSIONS.has(p)) {
        requiredPermsRef.current.delete(p);
        changed = true;
      }
    }
    if (changed) {
      setSelectedPerms((prev) => {
        const next = new Set<string>();
        for (const p of prev) {
          if (
            permSchema.permissions.includes(p) &&
            !FORBIDDEN_PERMISSIONS.has(p)
          )
            next.add(p);
        }
        return next;
      });
    }
  }, [permSchema]);

  // On subdomains of rotur.dev, default to selecting all non-forbidden
  // permissions once the schema has loaded.
  useEffect(() => {
    if (view !== "permissions") return;
    if (!defaultAllOnEntryRef.current) return;
    if (!permSchema) return;
    defaultAllOnEntryRef.current = false;
    const all = new Set<string>();
    for (const p of permSchema.permissions) {
      if (!FORBIDDEN_PERMISSIONS.has(p)) all.add(p);
    }
    setSelectedPerms(all);
  }, [view, permSchema]);

  useEffect(() => {
    if (showMissingWarn && missingRequired.length === 0) {
      setShowMissingWarn(false);
    }
  }, [showMissingWarn, missingRequired]);

  useEffect(() => {
    if (selectedPerms.size > 0 && scopeError) {
      setScopeError("");
    }
  }, [selectedPerms.size, scopeError]);

  useEffect(() => {
    if (view === "permissions" && account?.key) {
      fetchSubTokens(account.key);
    }
  }, [view, account?.key, fetchSubTokens]);

  useEffect(() => {
    if (view !== "signup") {
      if (
        captchaWidgetIdRef.current !== null &&
        typeof hcaptcha !== "undefined"
      ) {
        try {
          hcaptcha.reset(captchaWidgetIdRef.current);
        } catch {}
      }
      return;
    }

    let cancelled = false;

    const tryRender = () => {
      if (cancelled) return;
      const el = captchaRef.current;
      if (!el) return;
      if (typeof hcaptcha === "undefined") {
        setTimeout(tryRender, 100);
        return;
      }
      if (captchaWidgetIdRef.current !== null) {
        try {
          hcaptcha.remove(captchaWidgetIdRef.current);
        } catch {}
        captchaWidgetIdRef.current = null;
      }
      try {
        captchaWidgetIdRef.current = hcaptcha.render(el, {
          sitekey: "09def114-5bba-4ba6-8302-640aec7c1df2",
        });
      } catch {}
    };

    tryRender();

    return () => {
      cancelled = true;
      if (
        captchaWidgetIdRef.current !== null &&
        typeof hcaptcha !== "undefined"
      ) {
        try {
          hcaptcha.remove(captchaWidgetIdRef.current);
        } catch {}
        captchaWidgetIdRef.current = null;
      }
    };
  }, [view]);

  return (
    <AuthShell>
      <AuthSidebar
        title={sidebar.title}
        subtitle={sidebar.sub}
        footer={
          <AuthSidebarAction
            onClick={
              view === "permissions"
                ? handleSwitchAccount
                : view === "welcome"
                  ? () => showSignInForm()
                  : view === "forgot" || view === "reset"
                    ? () => showSignInForm()
                    : showWelcome
            }
          >
            <i
              class={`fas ${view === "permissions" ? "fa-user-plus" : addBtnIcon}`}
            />
            {view === "permissions"
              ? "Use another account"
              : view === "forgot" || view === "reset"
                ? "Back to sign in"
                : addBtnText}
          </AuthSidebarAction>
        }
      >
        {view === "permissions" && account ? (
          <button class={`${s.accountItem} ${s.accountItemActive}`}>
            <UserAvatar
              username={account.username}
              className={s.accountItemImg}
              size={32}
            />
            <div class={s.accountItemInfo}>
              <h3>{account.username}</h3>
              <p>Rotur Account</p>
            </div>
          </button>
        ) : savedAccounts.length === 0 ? (
          <div class={s.noAccounts}>
            <div class={s.noAccountsIcon}>
              <i class="fas fa-user-circle" />
            </div>
            <p class={s.noAccountsTitle}>No saved accounts</p>
            <p class={s.noAccountsSub}>Sign in to save your account</p>
          </div>
        ) : (
          savedAccounts.map((a) => (
            <div key={a.username} class={s.accountItemWrap}>
              <button
                class={`${s.accountItem} ${quickLoginBusy === a.username ? s.accountItemBusy : ""}`}
                onClick={() => quickLogin(a)}
                disabled={!!quickLoginBusy}
                title={
                  a.token
                    ? "Click to sign in"
                    : "Click to sign in with password"
                }
              >
                <UserAvatar
                  username={a.username}
                  pfp={a.avatar}
                  className={s.accountItemImg}
                  size={32}
                />
                <div class={s.accountItemInfo}>
                  <h3>{a.username}</h3>
                  <p>
                    {a.token
                      ? quickLoginBusy === a.username
                        ? "Signing in..."
                        : "Click to sign in"
                      : "Rotur Account"}
                  </p>
                </div>
                {a.token && quickLoginBusy !== a.username && (
                  <i class={`fas fa-bolt ${s.accountItemQuick}`} />
                )}
                {quickLoginBusy === a.username && (
                  <i class={`fas fa-spinner fa-spin ${s.accountItemQuick}`} />
                )}
              </button>
              <button
                class={s.accountItemRemove}
                onClick={(e) => {
                  e.stopPropagation();
                  removeAccountFromStorage(a.username);
                  setSavedAccounts(loadSavedAccounts());
                }}
                title={`Remove ${a.username}`}
                aria-label={`Remove ${a.username}`}
              >
                <i class="fas fa-xmark" />
              </button>
            </div>
          ))
        )}
      </AuthSidebar>

      {view === "permissions" && account ? (
        <div class={s.permView}>
          <div class={s.dpermHead}>
            <div class={s.dpermIcons}>
              <div class={s.dpermIconBox}>
                <i class="fas fa-globe" />
              </div>
              <i class={`fas fa-ellipsis ${s.dpermDots}`} />
              <div class={s.dpermIconBox}>
                <img src="/Rotur Logo.png" alt="Rotur" draggable={false} />
              </div>
            </div>
            <h1 class={s.dpermTitle}>{requestor}</h1>
            <p class={s.dpermSub}>wants to access your Rotur account</p>
            <p class={s.dpermSignedIn}>
              Signed in as <strong>{account.username}</strong>
              <button
                type="button"
                class={s.dpermSwitch}
                onClick={handleSwitchAccount}
              >
                Not you?
              </button>
            </p>
          </div>

          {requiresFullRef.current && !useFullAccess && (
            <div class={s.permMissingWarn}>
              <div class={s.permMissingWarnHead}>
                <i class="fas fa-triangle-exclamation" />
                <strong>{requestor} asked for full access</strong>
              </div>
              <p class={s.permMissingWarnText}>
                You're only granting some permissions. Some features on this app
                may not work as expected. Re-enable{" "}
                <strong>Full account access</strong> below to grant everything.
              </p>
            </div>
          )}

          <div class={s.permViewActions}>
            {matchingSubTokens.length > 0 && (
              <>
                {matchingSubTokens.map((sub) => (
                  <button
                    key={sub.id}
                    class={s.permActionExisting}
                    onClick={() => useSubTokenAndRedirect(sub, "existing")}
                  >
                    <i class="fas fa-key" />
                    <span class={s.permActionTitle}>Use existing token</span>
                    <span class={s.permActionSub}>
                      {sub.permissions.length} permission
                      {sub.permissions.length !== 1 ? "s" : ""} ·{" "}
                      {sub.name || "Unnamed"}
                    </span>
                  </button>
                ))}
                <div class={s.permActionDivider}>
                  <span>or grant new permissions</span>
                </div>
              </>
            )}

            <div class={s.dpermPanel}>
              <p class={s.dpermConfirm}>
                Confirm that you want to grant <strong>{requestor}</strong> the
                following permissions:
              </p>
              <div
                class={`${s.dpermList} ${useFullAccess ? s.dpermListOff : ""}`}
              >
                {!permSchema ? (
                  <div class={s.permLoading}>Loading permissions…</div>
                ) : (
                  Object.entries(displayedGroups).map(([cat, perms]) => (
                    <div key={cat} class={s.dpermCat}>
                      <div class={s.dpermCatLabel}>
                        <i class={`fas ${permIcon(perms[0])}`} /> {cat}
                      </div>
                      {perms.map((p) => {
                        const forbidden = FORBIDDEN_PERMISSIONS.has(p);
                        const checked = selectedPerms.has(p) && !forbidden;
                        const requested = requiredPermsRef.current.has(p);
                        return (
                          <label
                            key={p}
                            class={`${s.dpermRow} ${checked ? s.dpermRowOn : ""} ${forbidden ? s.dpermRowDisabled : ""}`}
                            title={p}
                          >
                            <input
                              type="checkbox"
                              class={s.dpermInput}
                              checked={checked}
                              disabled={forbidden || useFullAccess}
                              onChange={() => togglePerm(p)}
                            />
                            <span class={s.dpermBox}>
                              {checked && <i class="fas fa-check" />}
                            </span>
                            <span class={s.dpermName}>{describePerm(p)}</span>
                            {requested && (
                              <span class={s.dpermReq}>requested</span>
                            )}
                            {forbidden && (
                              <span class={s.dpermForbidden}>not allowed</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              {hasRequiredPerms && (
                <button
                  type="button"
                  class={s.dpermToggleAll}
                  onClick={() => setShowAllPerms((v) => !v)}
                >
                  <i
                    class={`fas fa-chevron-${showAllPermsEffective ? "up" : "down"}`}
                  />
                  {showAllPermsEffective
                    ? "Show only requested permissions"
                    : "Show all permissions"}
                </button>
              )}
            </div>

            <label
              class={`${s.permFullAccessToggle} ${useFullAccess ? s.permFullAccessToggleActive : ""} ${useFullAccess ? s.permFullAccessToggleDanger : ""}`}
            >
              <input
                type="checkbox"
                checked={useFullAccess}
                onChange={(e: any) => {
                  const next = e.target.checked;
                  setUseFullAccess(next);
                  setShowMissingWarn(false);
                  if (next) setScopeError("");
                }}
                class={s.permFullAccessCheckbox}
              />
              <div class={s.permFullAccessCheck}>
                {useFullAccess && <i class="fas fa-check" />}
              </div>
              <div class={s.permFullAccessBody}>
                <span class={s.permFullAccessTitle}>
                  <i class="fas fa-bolt" /> Full account access
                </span>
                <span class={s.permFullAccessSub}>
                  Send your main account token instead of a limited sub-token
                </span>
              </div>
            </label>

            {useFullAccess && (
              <div class={s.permDangerWarning}>
                <div class={s.permDangerWarningHead}>
                  <i class="fas fa-triangle-exclamation" />
                  <strong>
                    {requestor} will be able to do anything you can. That
                    includes:
                  </strong>
                </div>
                <ul class={s.permDangerList}>
                  <li>
                    <i class="fas fa-id-card" /> Read and change everything in
                    your account
                  </li>
                  <li>
                    <i class="fas fa-coins" /> Spend and transfer your credits
                  </li>
                  <li>
                    <i class="fas fa-folder-open" /> Read, upload, and delete
                    your files
                  </li>
                  <li>
                    <i class="fas fa-key" /> View and manage your keys and
                    tokens
                  </li>
                </ul>
                <p class={s.permDangerWarningNote}>
                  Only enable this if you fully trust {requestor}. Otherwise
                  turn it off and grant just the permissions above. A scoped
                  token is almost always the safer choice.
                </p>
              </div>
            )}

            <div class={s.dpermFooter}>
              <span class={s.dpermCount}>
                {useFullAccess ? (
                  "Full account access"
                ) : (
                  <>
                    <strong>{selectedPerms.size}</strong> permission
                    {selectedPerms.size !== 1 ? "s" : ""} selected
                  </>
                )}
              </span>
              <div class={s.dpermFooterActions}>
                <button
                  type="button"
                  class={s.dpermBack}
                  onClick={handleCancelAccess}
                >
                  Back
                </button>
                <button
                  type="button"
                  class={`${s.dpermAuthorize} ${useFullAccess ? s.dpermAuthorizeDanger : ""}`}
                  onClick={useFullAccess ? handleAllowAccess : attemptSubmit}
                  disabled={
                    scopeBtn.disabled ||
                    (!useFullAccess && selectedPerms.size === 0)
                  }
                  style={
                    scopeBtn.color
                      ? { background: scopeBtn.color, color: "var(--void)" }
                      : undefined
                  }
                >
                  {scopeBtn.color ? scopeBtn.text : "Authorize"}
                </button>
              </div>
            </div>
            {showMissingWarn && missingRequired.length > 0 && (
              <div class={s.permMissingWarn}>
                <div class={s.permMissingWarnHead}>
                  <i class="fas fa-triangle-exclamation" />
                  <strong>{requestor} may not work as expected</strong>
                </div>
                <p class={s.permMissingWarnText}>
                  You removed {missingRequired.length} requested permission
                  {missingRequired.length !== 1 ? "s" : ""}:
                </p>
                <div class={s.permRequiredTags}>
                  {missingRequired.map((p) => (
                    <span
                      key={p}
                      class={`${s.permRequiredTag} ${s.permRequiredTagMissing}`}
                    >
                      <i class="fas fa-xmark" />
                      {p}
                    </span>
                  ))}
                </div>
                <p class={s.permMissingWarnSub}>
                  Without{" "}
                  {missingRequired.length === 1
                    ? "this permission"
                    : "these permissions"}
                  , the app may break, show errors, or fail silently.
                </p>
                <div class={s.permMissingWarnActions}>
                  <button
                    type="button"
                    class={s.permCancelBtn}
                    onClick={() => setShowMissingWarn(false)}
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    class={s.permAllowBtn}
                    onClick={() => {
                      setShowMissingWarn(false);
                      handleAllowScopedAccess();
                    }}
                  >
                    Continue anyway
                  </button>
                </div>
              </div>
            )}
            {scopeError && <div class={s.permError}>{scopeError}</div>}
          </div>

          <AuthTosLinks>
            <p>
              <a href="/privacy-policy?from=auth">Privacy Policy</a> •{" "}
              <a href="/terms-of-service?from=auth">Terms of Service</a>
            </p>
          </AuthTosLinks>
        </div>
      ) : view === "confirm" ? (
        <div class={s.welcomeArea}>
          <div class={s.welcomeLogo}>
            <img src="/Rotur Logo.png" alt="Rotur" draggable={false} />
          </div>
          <div class={s.welcomeContent}>
            <h1>
              {pendingAutoLoginRef.current?.username
                ? `Continue as ${pendingAutoLoginRef.current.username}?`
                : "Continue to Rotur?"}
            </h1>
            <p>You're already signed in to Rotur. Continue to {requestor}?</p>
          </div>
          <button
            type="button"
            class={s.confirmCard}
            onClick={handleConfirmContinue}
            disabled={!!quickLoginBusy}
          >
            <UserAvatar
              username={pendingAutoLoginRef.current?.username || ""}
              className={s.confirmCardImg}
              size={44}
            />
            <div class={s.confirmCardInfo}>
              <h3>{pendingAutoLoginRef.current?.username || "Your account"}</h3>
              <p>Rotur Account</p>
            </div>
            {quickLoginBusy ? (
              <i class={`fas fa-spinner fa-spin ${s.confirmCardArrow}`} />
            ) : (
              <i class={`fas fa-arrow-right ${s.confirmCardArrow}`} />
            )}
          </button>
          <div class={s.welcomeButtons}>
            <button
              class={s.btnWelcomeSecondary}
              onClick={handleConfirmReject}
              disabled={!!quickLoginBusy}
            >
              <i class="fas fa-user-group" /> Use another account
            </button>
          </div>
          <AuthTosLinks>
            <p>
              <a
                href="https://rotur.dev/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://rotur.dev/privacy-policy?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </AuthTosLinks>
        </div>
      ) : view === "welcome" ? (
        <div class={s.welcomeArea}>
          <div class={s.welcomeLogo}>
            <img src="/Rotur Logo.png" alt="Rotur" draggable={false} />
          </div>
          <div class={s.welcomeContent}>
            <h1>Welcome to Rotur</h1>
            <p>Sign in to access your account or create a new one.</p>
          </div>
          <div class={s.welcomeButtons}>
            <button
              class={s.btnWelcomePrimary}
              onClick={() => showSignInForm()}
            >
              <i class="fas fa-sign-in-alt" /> Sign In
            </button>
            <button class={s.btnWelcomeSecondary} onClick={showSignUpForm}>
              <i class="fas fa-user-plus" /> Create Account
            </button>
          </div>
          <AuthTosLinks>
            <p>
              <a
                href="https://rotur.dev/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://rotur.dev/privacy-policy?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </AuthTosLinks>
        </div>
      ) : view === "signin" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Sign in to Rotur</AuthHeading>
          <AuthSubheading>Use your Rotur account</AuthSubheading>
          <form class={s.signinForm} onSubmit={handleSigninSubmit}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="username"
                placeholder="Username"
                required
                value={siUsername}
                onInput={(e: any) => setSiUsername(e.target.value)}
              />
            </AuthFormGroup>
            <AuthFormGroup>
              <AuthInput
                type="password"
                name="password"
                placeholder="Password"
                required
                value={siPassword}
                onInput={(e: any) => setSiPassword(e.target.value)}
              />
            </AuthFormGroup>
            <AuthBtnPrimary
              type="submit"
              disabled={siBtn.disabled}
              style={siBtn.color ? { background: siBtn.color } : undefined}
            >
              {siBtn.text}
            </AuthBtnPrimary>
          </form>
          <AuthTosLinks>
            <p>
              <AuthTosLinkBtn onClick={showForgot}>
                Forgot password?
              </AuthTosLinkBtn>
            </p>
            <p>
              Don't have an account?{" "}
              <AuthTosLinkBtn onClick={showSignUpForm}>
                Create one
              </AuthTosLinkBtn>
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <a
                href="https://rotur.dev/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://rotur.dev/privacy-policy?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : view === "verify" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Verify your email</AuthHeading>
          <AuthSubheading>
            We've sent a verification link to{" "}
            <strong>
              {pendingVerificationRef.current?.email ||
                pendingVerificationRef.current?.username ||
                "your email"}
            </strong>
            . You'll be signed in automatically once verified.
          </AuthSubheading>
          <p class={s.verifyInstruction}>
            Click the link in the email to continue. You can also press{" "}
            <strong>Done</strong> once you've verified, or resend the email.
          </p>
          <div class={s.verifyBtns}>
            <AuthBtnPrimary onClick={handleVerifyDone}>
              I've verified - continue
            </AuthBtnPrimary>
            <AuthBtnSecondary onClick={handleVerifyResend}>
              Resend email
            </AuthBtnSecondary>
            <AuthBtnSecondary onClick={handleVerifyCancel}>
              Cancel
            </AuthBtnSecondary>
          </div>
          {verifyMsg && <div class={s.verifyMsg}>{verifyMsg}</div>}
        </AuthMain>
      ) : view === "tos" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Accept the Terms of Service</AuthHeading>
          <AuthSubheading>
            One last step before you can use Rotur. Please read and accept our
            terms to continue.
          </AuthSubheading>
          <div ref={tosContentRef} class={s.tosFrameContent}>
            <TosContent />
          </div>
          {!tosScrolledToBottom && (
            <p class={s.tosScrollHint}>
              <i class="fas fa-arrow-down" /> Scroll to the bottom to accept
            </p>
          )}
          <label class={s.tosCheckboxLabel}>
            <input
              type="checkbox"
              class={s.tosCheckbox}
              checked={tosCheckboxChecked}
              disabled={!tosScrolledToBottom || tosAccepted}
              onChange={(e: any) => setTosCheckboxChecked(e.target.checked)}
            />
            I have read and agree to the Terms of Service
          </label>
          <div class={s.verifyBtns}>
            <AuthBtnPrimary
              onClick={handleTosAccept}
              disabled={tosBtn.disabled || tosAccepted || !tosCheckboxChecked}
              style={tosBtn.color ? { background: tosBtn.color } : undefined}
            >
              {tosBtn.text || (
                <>
                  <i class="fas fa-check" /> Accept Terms & Continue
                </>
              )}
            </AuthBtnPrimary>
          </div>
        </AuthMain>
      ) : view === "signup" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Create account</AuthHeading>
          <AuthSubheading>Join Rotur today</AuthSubheading>
          <form onSubmit={handleSignupSubmit}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="username"
                placeholder="Choose a username"
                required
                minlength={3}
                maxlength={20}
                value={suUsername}
                onInput={(e: any) => setSuUsername(e.target.value)}
              />
            </AuthFormGroup>
            <AuthFormGroup>
              <AuthInput
                type="email"
                name="email"
                placeholder="Email address"
                required
                value={suEmail}
                onInput={(e: any) => setSuEmail(e.target.value)}
              />
            </AuthFormGroup>
            <AuthFormGroup>
              <AuthInput
                type="password"
                name="password"
                placeholder="Create password"
                required
                minlength={8}
                value={suPassword}
                onInput={(e: any) => setSuPassword(e.target.value)}
              />
            </AuthFormGroup>
            <AuthFormGroup>
              <AuthInput
                type="password"
                name="confirm-password"
                placeholder="Confirm password"
                required
                minlength={8}
                value={suConfirm}
                onInput={(e: any) => setSuConfirm(e.target.value)}
              />
            </AuthFormGroup>
            <div class={s.formGroup} style={{ marginTop: "0.75rem" }}>
              <div ref={captchaRef} />
            </div>
            <AuthBtnPrimary
              type="submit"
              disabled={suBtn.disabled}
              style={suBtn.color ? { background: suBtn.color } : undefined}
            >
              {suBtn.text}
            </AuthBtnPrimary>
          </form>
          <AuthTosLinks>
            <p>
              Already have an account?{" "}
              <AuthTosLinkBtn onClick={() => showSignInForm()}>
                Sign in
              </AuthTosLinkBtn>
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <a
                href="https://rotur.dev/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://rotur.dev/privacy-policy?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : view === "forgot" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Forgot your password?</AuthHeading>
          <AuthSubheading>
            Enter the email address on your account and we'll send you a reset
            link.
          </AuthSubheading>
          <form onSubmit={handleForgotSubmit} class={s.signinForm}>
            <AuthFormGroup>
              <AuthInput
                type="email"
                name="email"
                placeholder="Email address"
                required
                value={forgotEmail}
                onInput={(e: any) => setForgotEmail(e.target.value)}
              />
            </AuthFormGroup>
            <AuthBtnPrimary
              type="submit"
              disabled={forgotBtn.disabled}
              style={
                forgotBtn.color ? { background: forgotBtn.color } : undefined
              }
            >
              {forgotBtn.text}
            </AuthBtnPrimary>
          </form>
          {forgotMsg && (
            <div class={s.forgotMsg}>
              <i class="fas fa-circle-info" />
              <span>{forgotMsg}</span>
            </div>
          )}
          <AuthTosLinks>
            <p>
              Remembered it?{" "}
              <AuthTosLinkBtn onClick={() => showSignInForm()}>
                Back to sign in
              </AuthTosLinkBtn>
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <a
                href="https://rotur.dev/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://rotur.dev/privacy-policy?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : view === "reset" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Set a new password</AuthHeading>
          <AuthSubheading>
            Enter the reset code from your email and choose a new password.
          </AuthSubheading>
          <form onSubmit={handleResetSubmit} class={s.signinForm}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="reset-token"
                placeholder="Reset code"
                required
                value={resetToken}
                onInput={(e: any) => setResetToken(e.target.value)}
                autoComplete="one-time-code"
              />
            </AuthFormGroup>
            <AuthFormGroup>
              <AuthInput
                type="password"
                name="new-password"
                placeholder="New password (8+ characters)"
                required
                minlength={8}
                value={resetNewPw}
                onInput={(e: any) => setResetNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </AuthFormGroup>
            <AuthFormGroup>
              <AuthInput
                type="password"
                name="confirm-password"
                placeholder="Confirm new password"
                required
                minlength={8}
                value={resetConfirm}
                onInput={(e: any) => setResetConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </AuthFormGroup>
            <AuthBtnPrimary
              type="submit"
              disabled={resetBtn.disabled}
              style={
                resetBtn.color ? { background: resetBtn.color } : undefined
              }
            >
              {resetBtn.text}
            </AuthBtnPrimary>
          </form>
          {resetMsg && (
            <div class={s.forgotMsg}>
              <i class="fas fa-circle-info" />
              <span>{resetMsg}</span>
            </div>
          )}
          <AuthTosLinks>
            <p>
              <AuthTosLinkBtn onClick={showForgot}>
                Didn't get the email? Try again
              </AuthTosLinkBtn>
            </p>
            <p>
              <AuthTosLinkBtn onClick={() => showSignInForm()}>
                Back to sign in
              </AuthTosLinkBtn>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : null}
    </AuthShell>
  );
}
