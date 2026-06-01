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
  AuthNotice,
  AuthTosLinks,
  AuthTosLinkBtn,
} from "../components/auth/Shell";
import { UserAvatar } from "../components/UserAvatar";

declare const CryptoJS: any;
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

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
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

type View = "welcome" | "signin" | "signup" | "verify" | "permissions";
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
  permissions: { title: "Account Access", sub: "Choose account to continue" },
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

  const [verifyMsg, setVerifyMsg] = useState("");

  const [account, setAccount] = useState<AccountData | null>(null);
  const [quickLoginBusy, setQuickLoginBusy] = useState<string | null>(null);
  const [subTokens, setSubTokens] = useState<SubToken[]>([]);
  const [, setSubTokensLoading] = useState(false);

  // Scope-aware auth state
  const returnToRef = useRef<string>("https://rotur.dev/me");
  const systemNameRef = useRef<string>("rotur");
  const pendingVerificationRef = useRef<{
    token: string;
    username: string;
  } | null>(null);
  const requiredPermsRef = useRef<Set<string>>(new Set());

  // Permission picker state
  const [permSchema, setPermSchema] = useState<PermissionSchema | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState("");
  const [scopeBtn, setScopeBtn] = useState<BtnState>(defaultBtn("Continue"));
  const [scopeError, setScopeError] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [useFullAccess, setUseFullAccess] = useState(false);

  const sidebar = useMemo(() => sidebarForView[view], [view]);
  const addBtnText = view === "welcome" ? "Use another account" : "Back";
  const addBtnIcon = view === "welcome" ? "fa-user-plus" : "fa-arrow-left";

  const requestor = useMemo(() => {
    try {
      return new URL(returnToRef.current).hostname;
    } catch {
      return "This website";
    }
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
    }

    const tokenParam = params.get("token");
    if (tokenParam) {
      verifyTokenAndProceed(tokenParam);
      return;
    }

    const stylesUrl = params.get("styles") || "./auth.css";
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = stylesUrl;
    document.head.appendChild(link);

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
    const finalUrl = new URL(returnTo);
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
      setAccount(data);
      setSelectedPerms(new Set(requiredPermsRef.current));
      setPermSearch("");
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
      const ref = new URL(returnToRef.current);
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
        const defaultReturn = "https://rotur.dev/me";
        const isOwnDomain = returnToRef.current === defaultReturn;

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
          const ref = new URL(returnToRef.current);
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
      const hash = CryptoJS.MD5(siPassword).toString();
      setCookie("username", siUsername, 7);
      setSiBtn(loadingBtn("Signing in..."));

      try {
        const data = await requestAccount(siUsername, hash);
        if (!data.error) {
          handleAccountLogin(data);
        } else if ((data as any).requiresTOSAcceptance) {
          const url = new URL("/terms-of-service", location.origin);
          url.searchParams.set("token", (data as any).key);
          if (returnToRef.current)
            url.searchParams.set("return_to", returnToRef.current);
          location.href = url.toString();
        } else if ((data as any).requiresEmailVerification) {
          pendingVerificationRef.current = {
            token: (data as any).token,
            username: (data as any).username,
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
      const hash = CryptoJS.MD5(suPassword).toString();

      try {
        const res = await fetch(`${API}/create_user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: suUsername,
            email: suEmail,
            password: hash,
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
          const data = await requestAccount(suUsername, hash);
          if (!data.error) {
            handleAccountLogin(data);
          } else if ((data as any).requiresTOSAcceptance) {
            const url = new URL("/terms-of-service", location.origin);
            url.searchParams.set("token", (data as any).key);
            if (returnToRef.current)
              url.searchParams.set("return_to", returnToRef.current);
            location.href = url.toString();
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
      if (data["sys.email_verified"]) {
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
    const ref = new URL(returnToRef.current);
    ref.searchParams.set("token", account.key);
    location.href = ref.toString();
  }, [account]);

  const handleLogout = useCallback(() => {
    document.cookie = "username=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;";
    location.reload();
  }, []);

  const handleCancelAccess = useCallback(() => {
    history.back();
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

  const isGroupActive = useCallback(
    (perms: string[]): boolean => {
      return perms.every(
        (p) => selectedPerms.has(p) || FORBIDDEN_PERMISSIONS.has(p),
      );
    },
    [selectedPerms],
  );

  const toggleGroup = useCallback((perms: string[]) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      const allActive = perms.every(
        (p) => next.has(p) || FORBIDDEN_PERMISSIONS.has(p),
      );
      if (allActive) {
        for (const p of perms) next.delete(p);
      } else {
        for (const p of perms) if (!FORBIDDEN_PERMISSIONS.has(p)) next.add(p);
      }
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

  const groupIcon = useCallback((name: string): string => {
    const icons: Record<string, string> = {
      read_only: "fa-eye",
      social: "fa-users",
      economy: "fa-coins",
      storage: "fa-folder-open",
      full: "fa-bolt",
    };
    return icons[name] || "fa-shield-halved";
  }, []);

  const formatGroupName = useCallback((name: string): string => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }, []);

  const clearAll = useCallback(() => {
    if (requiredPermsRef.current.size > 0) {
      setSelectedPerms(new Set(requiredPermsRef.current));
    } else {
      setSelectedPerms(new Set());
    }
  }, []);

  const [showMissingWarn, setShowMissingWarn] = useState(false);

  const handleAllowScopedAccess = useCallback(async () => {
    if (!account?.key) return;
    if (selectedPerms.size === 0) {
      setScopeError("Pick at least one permission, or use Full access above.");
      return;
    }
    setScopeError("");
    setScopeBtn(loadingBtn("Creating token…"));
    try {
      const body: any = {
        name: requestor || "Third-party app",
        permissions: Array.from(selectedPerms),
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
            permissions: Array.from(selectedPerms),
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
            permissions: Array.from(selectedPerms),
            id: data.id,
          },
          "*",
        );
      }
      const ref = new URL(returnToRef.current);
      ref.searchParams.set("token", subToken);
      location.href = ref.toString();
    } catch (e: any) {
      setScopeBtn(errorBtn(e?.message || "Network error"));
      setTimeout(() => setScopeBtn(defaultBtn("Continue")), 3000);
    }
  }, [account, selectedPerms, requestor]);

  const attemptSubmit = useCallback(() => {
    if (missingRequired.length > 0) {
      setShowMissingWarn(true);
      return;
    }
    handleAllowScopedAccess();
  }, [missingRequired, handleAllowScopedAccess]);

  const visiblePerms = useMemo(() => {
    const all = permSchema?.permissions || [];
    if (!permSearch.trim()) return all;
    const q = permSearch.toLowerCase();
    return all.filter((p) => p.toLowerCase().includes(q));
  }, [permSchema, permSearch]);

  // Group visible perms by category for compact display
  const groupedVisible = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const p of visiblePerms) {
      const cat = p.split(":")[0];
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [visiblePerms]);

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

  useEffect(() => {
    if (view === "permissions" && account?.key) {
      fetchSubTokens(account.key);
    }
  }, [view, account?.key, fetchSubTokens]);

  return (
    <AuthShell>
      <AuthSidebar
        title={sidebar.title}
        subtitle={sidebar.sub}
        footer={
          <AuthSidebarAction
            onClick={
              view === "permissions"
                ? handleLogout
                : view === "welcome"
                  ? () => showSignInForm()
                  : showWelcome
            }
          >
            <i
              class={`fas ${view === "permissions" ? "fa-user-plus" : addBtnIcon}`}
            />
            {view === "permissions" ? "Use another account" : addBtnText}
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
          <div class={s.permViewHeader}>
            <AuthLogo />
            <AuthHeading>Choose what to share</AuthHeading>
            <AuthSubheading>
              <strong>{requestor}</strong> wants to access your Rotur account.
            </AuthSubheading>
          </div>

          <AuthNotice
            variant="info"
            icon="fas fa-shield-halved"
            title="Two ways to grant access"
          >
            <strong>Full access</strong> gives the site everything your account
            can do. <strong>Custom permissions</strong> creates a sub-token
            limited to only the actions you allow.
          </AuthNotice>

          {requiredPermsRef.current.size > 0 && (
            <div class={s.permRequiredNotice}>
              <div class={s.permRequiredHead}>
                <i class="fas fa-circle-exclamation" />
                <strong>{requestor} requests these permissions</strong>
              </div>
              <div class={s.permRequiredTags}>
                {Array.from(requiredPermsRef.current).map((p) => (
                  <span key={p} class={s.permRequiredTag}>
                    <i class="fas fa-asterisk" />
                    {p}
                  </span>
                ))}
              </div>
              <p class={s.permRequiredSub}>
                {requestor} may not work as expected if you decline any of
                these. They're pre-selected below, but you can uncheck them.
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
                  <span>or create a new token</span>
                </div>
              </>
            )}

            <div class={s.permGroupGrid}>
              {permSchema?.groups
                ?.filter((g) => g.name !== "full")
                .map((g) => {
                  const active = isGroupActive(g.permissions);
                  return (
                    <button
                      type="button"
                      key={g.name}
                      class={`${s.permGroupCard} ${active ? s.permGroupCardActive : ""}`}
                      onClick={() => toggleGroup(g.permissions)}
                    >
                      <div class={s.permGroupCardHead}>
                        <i
                          class={`fas ${groupIcon(g.name)} ${s.permGroupCardIcon}`}
                        />
                        <div class={s.permGroupCardCheck}>
                          {active ? (
                            <i class="fas fa-check" />
                          ) : (
                            <i class="fas fa-plus" />
                          )}
                        </div>
                      </div>
                      <div class={s.permGroupCardName}>
                        {formatGroupName(g.name)}
                      </div>
                      <div class={s.permGroupCardDesc}>{g.description}</div>
                      <div class={s.permGroupCardMeta}>
                        {g.permissions.length} permission
                        {g.permissions.length !== 1 ? "s" : ""}
                      </div>
                    </button>
                  );
                })}
            </div>

            <button
              class={s.permCustomizeToggle}
              onClick={() => setShowCustom(!showCustom)}
            >
              <i class={`fas fa-chevron-${showCustom ? "up" : "down"}`} />
              {showCustom ? "Hide" : "Customize"} individual permissions
            </button>

            {showCustom && (
              <div class={s.permPickerInline}>
                <div class={s.permPickerControls}>
                  <button
                    type="button"
                    class={s.permLinkBtn}
                    onClick={clearAll}
                  >
                    <i class="fas fa-xmark" /> Clear
                  </button>
                </div>
                <input
                  type="text"
                  class={s.permSearch}
                  placeholder="Search permissions…"
                  value={permSearch}
                  onInput={(e: any) => setPermSearch(e.target.value)}
                />
                <div class={s.permListScroll}>
                  {!permSchema ? (
                    <div class={s.permLoading}>Loading permissions…</div>
                  ) : Object.keys(groupedVisible).length === 0 ? (
                    <div class={s.permLoading}>
                      No permissions match your search.
                    </div>
                  ) : (
                    Object.entries(groupedVisible).map(([cat, perms]) => (
                      <div key={cat} class={s.permCategory}>
                        <div class={s.permCategoryHeader}>{cat}</div>
                        <div class={s.permList}>
                          {perms.map((p) => {
                            const forbidden = FORBIDDEN_PERMISSIONS.has(p);
                            const isRequested = requiredPermsRef.current.has(p);
                            const checked = selectedPerms.has(p);
                            return (
                              <label
                                key={p}
                                class={`${s.permItem} ${checked ? s.permItemChecked : ""} ${forbidden ? s.permItemForbidden : ""} ${isRequested ? s.permItemRequested : ""} ${isRequested && !checked ? s.permItemRequestedMissing : ""}`}
                                title={
                                  isRequested
                                    ? "Requested by this site"
                                    : undefined
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={forbidden}
                                  onChange={() => togglePerm(p)}
                                />
                                <span class={s.permItemLabel}>{p}</span>
                                {isRequested && (
                                  <span class={s.permBadge}>requested</span>
                                )}
                                {!isRequested && forbidden && (
                                  <span class={s.permBadge}>forbidden</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <label
              class={`${s.permFullAccessToggle} ${useFullAccess ? s.permFullAccessToggleActive : ""} ${useFullAccess ? s.permFullAccessToggleDanger : ""}`}
            >
              <input
                type="checkbox"
                checked={useFullAccess}
                onChange={(e: any) => setUseFullAccess(e.target.checked)}
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
                  <strong>This site will be able to:</strong>
                </div>
                <ul class={s.permDangerWarningList}>
                  <li>
                    <i class="fas fa-xmark" /> Delete your account permanently
                  </li>
                  <li>
                    <i class="fas fa-xmark" /> Transfer all your credits away
                  </li>
                  <li>
                    <i class="fas fa-xmark" /> Change your account settings and
                    password
                  </li>
                  <li>
                    <i class="fas fa-xmark" /> Create, revoke, and manage all
                    your tokens
                  </li>
                  <li>
                    <i class="fas fa-xmark" /> Post, delete, and manage all your
                    content
                  </li>
                </ul>
                <p class={s.permDangerWarningNote}>
                  Only enable this if you fully trust{" "}
                  <strong>{requestor}</strong>. A scoped sub-token above is
                  almost always the safer choice.
                </p>
              </div>
            )}

            <div class={s.permPickerFooter}>
              <span class={s.permCount}>
                <strong>{useFullAccess ? "all" : selectedPerms.size}</strong>{" "}
                permission{useFullAccess || selectedPerms.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <div class={s.permPickerActions}>
                <button
                  type="button"
                  class={s.permCancelBtn}
                  onClick={handleCancelAccess}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class={`${s.permAllowBtn} ${useFullAccess ? s.permAllowBtnDanger : ""}`}
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
                  {scopeBtn.color
                    ? scopeBtn.text
                    : useFullAccess
                      ? "Continue with all permissions"
                      : "Continue"}
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
              <a href="/terms-of-service?from=auth">Terms of Service</a> •{" "}
              <a href="/privacy-policy?from=auth">Privacy Policy</a>
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
              Don't have an account?{" "}
              <AuthTosLinkBtn onClick={showSignUpForm}>
                Create one
              </AuthTosLinkBtn>
            </p>
            <p style={{ marginTop: "0.25rem" }}>
              <a href="/terms-of-service?from=auth">Terms of Service</a> •{" "}
              <a href="/privacy-policy?from=auth">Privacy Policy</a>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : view === "verify" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>Verify your email</AuthHeading>
          <AuthSubheading>
            We've sent a verification link to{" "}
            {pendingVerificationRef.current?.username || ""}.
          </AuthSubheading>
          <p class={s.verifyInstruction}>
            Please click the link in the email and then press{" "}
            <strong>Done</strong> below.
          </p>
          <div class={s.verifyBtns}>
            <AuthBtnPrimary onClick={handleVerifyDone}>Done</AuthBtnPrimary>
            <AuthBtnSecondary onClick={handleVerifyResend}>
              Resend email
            </AuthBtnSecondary>
            <AuthBtnSecondary onClick={handleVerifyCancel}>
              Cancel
            </AuthBtnSecondary>
          </div>
          {verifyMsg && <div class={s.verifyMsg}>{verifyMsg}</div>}
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
              <div
                class="h-captcha"
                data-sitekey="09def114-5bba-4ba6-8302-640aec7c1df2"
              />
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
              <a href="/terms-of-service?from=auth">Terms of Service</a> •{" "}
              <a href="/privacy-policy?from=auth">Privacy Policy</a>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : null}
    </AuthShell>
  );
}
