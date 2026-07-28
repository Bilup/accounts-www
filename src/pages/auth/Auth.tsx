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
import { PermissionsView } from "./PermissionsView";

declare const hcaptcha: any;

import {
  API,
  FORBIDDEN_PERMISSIONS,
  sidebarForView,
  getHostname,
  isAutoLoginHost,
  isRoturSubdomain,
  returnUrl,
  isValidEmail,
  isTokenUsable,
  tokenMatchesDomain,
  defaultBtn,
  loadingBtn,
  errorBtn,
  successBtn,
  loadSavedAccounts,
  saveAccountToStorage,
  removeAccountFromStorage,
  setCookie,
  getCookie,
  requestAccount,
} from "./lib";
import type {
  AccountData,
  SavedAccount,
  PermissionSchema,
  SubToken,
  View,
  BtnState,
} from "./lib";

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
  const returnToRef = useRef<string>("https://accounts.bilup.org/me");
  const systemNameRef = useRef<string>("rotur");
  const pendingVerificationRef = useRef<{
    token: string;
    username: string;
    email: string;
  } | null>(null);
  const requiredPermsRef = useRef<Set<string>>(new Set());
  const requiresFullRef = useRef(false);
  const pendingAutoLoginRef = useRef<{
    token: string;
    username: string;
  } | null>(null);

  const [permSchema, setPermSchema] = useState<PermissionSchema | null>(null);
  const [scopeBtn, setScopeBtn] = useState<BtnState>(defaultBtn("Allow"));
  const [scopeError, setScopeError] = useState("");
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

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
      params.get("return_to") ?? savedReturnTo ?? "https://accounts.bilup.org/me";
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
            // Surface it in the sign-in button like every other auth error,
            // instead of a native alert the user must dismiss to retry.
            setSiBtn(errorBtn(data.error));
            setTimeout(() => setSiBtn(defaultBtn("Sign in")), 4000);
            return;
          }
          handleAccountLogin(data);
        })
        .catch(() => {
          setSiBtn(errorBtn("Google sign-in failed"));
          setTimeout(() => setSiBtn(defaultBtn("Sign in")), 4000);
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

  const deliverAuthToken = useCallback(
    (token: string, extra: Record<string, unknown> = {}) => {
      const returnTo = returnToRef.current;
      const payload = {
        type: "rotur-auth-token",
        token,
        return_to: returnTo,
        ...extra,
      };
      if (window.opener) {
        window.opener.postMessage(payload, "*");
        setTimeout(() => window.close(), 300);
        return;
      }
      if (window.parent !== window) {
        window.parent.postMessage(payload, "*");
        return;
      }
      const finalUrl = returnUrl(returnTo);
      finalUrl.searchParams.set("token", token);
      location.href = finalUrl.toString();
    },
    [],
  );

  const useSubTokenAndRedirect = useCallback(
    (sub: SubToken, scope: "scoped" | "existing" = "existing") => {
      if (!sub.token) return;
      deliverAuthToken(sub.token, {
        scope,
        permissions: sub.permissions,
        id: sub.id,
      });
    },
    [deliverAuthToken],
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

  const confirmMainToken = useCallback(() => {
    if (!account?.key) return;
    saveAccountToStorage(account);
    deliverAuthToken(account.key, { scope: "full" });
  }, [account, deliverAuthToken]);

  const deleteToken = useCallback(
    async (sub: SubToken) => {
      if (!account?.key || !sub.id) return;
      setDeletingTokenId(sub.id);
      try {
        await fetch(
          `${API}/tokens/${sub.id}?auth=${encodeURIComponent(account.key)}`,
          { method: "DELETE" },
        );
        await fetchSubTokens(account.key);
      } catch {
        /* ignore */
      } finally {
        setDeletingTokenId(null);
      }
    },
    [account, fetchSubTokens],
  );

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
      avatar: `https://avatars.accounts.bilup.org/${pending.username}`,
      token: pending.token,
    });
  }, [quickLogin]);

  const handleConfirmReject = useCallback(() => {
    pendingAutoLoginRef.current = null;
    setView("welcome");
  }, []);

  const createTokenAndRedirect = useCallback(
    async (perms: string[]) => {
      if (!account?.key || perms.length === 0) return;
      setScopeError("");
      setScopeBtn(loadingBtn("Creating token…"));
      try {
        const res = await fetch(
          `${API}/tokens/create?auth=${encodeURIComponent(account.key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: requestor || "Third-party app",
              permissions: perms,
              origin: requestor,
              description: `Scoped access for ${requestor}`,
              websites: [returnToRef.current],
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setScopeBtn(errorBtn(data.error || "Failed to create token"));
          setTimeout(() => setScopeBtn(defaultBtn("Allow")), 3000);
          return;
        }
        saveAccountToStorage(account);
        deliverAuthToken(data.token as string, {
          scope: "scoped",
          permissions: perms,
          id: data.id,
        });
      } catch (e: any) {
        setScopeBtn(errorBtn(e?.message || "Network error"));
        setTimeout(() => setScopeBtn(defaultBtn("Allow")), 3000);
      }
    },
    [account, requestor, deliverAuthToken],
  );

  const siteTokens = useMemo(
    () =>
      subTokens.filter(
        (t) => isTokenUsable(t) && tokenMatchesDomain(t, returnToRef.current),
      ),
    [subTokens],
  );

  const [, setSchemaVersion] = useState(0);
  const permissionsRequested = Array.from(requiredPermsRef.current).filter(
    (p) => !FORBIDDEN_PERMISSIONS.has(p),
  );
  useEffect(() => {
    if (!permSchema) return;
    const valid = new Set(permSchema.permissions);
    let changed = false;
    for (const p of Array.from(requiredPermsRef.current)) {
      if (!valid.has(p) || FORBIDDEN_PERMISSIONS.has(p)) {
        requiredPermsRef.current.delete(p);
        changed = true;
      }
    }
    if (changed) setSchemaVersion((v) => v + 1);
  }, [permSchema]);

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
              <p>Bilup Account</p>
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
                      : "Bilup Account"}
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
        <PermissionsView
          requestor={requestor}
          username={account.username}
          requiresFull={requiresFullRef.current}
          defaultAll={isRoturSubdomain(returnToRef.current)}
          requiredPerms={permissionsRequested}
          permSchema={permSchema}
          siteTokens={siteTokens}
          scopeBtn={scopeBtn}
          scopeError={scopeError}
          deletingTokenId={deletingTokenId}
          onUseSubToken={(t) => useSubTokenAndRedirect(t, "existing")}
          onDeleteToken={deleteToken}
          onCreateToken={createTokenAndRedirect}
          onUseMainToken={confirmMainToken}
          onSwitchAccount={handleSwitchAccount}
          onCancel={handleCancelAccess}
        />
      ) : view === "confirm" ? (
        <div class={s.welcomeArea}>
          <div class={s.welcomeLogo}>
            <img src="/logo.png" alt="Bilup Accounts" draggable={false} />
          </div>
          <div class={s.welcomeContent}>
            <h1>
              {pendingAutoLoginRef.current?.username
                ? `Continue as ${pendingAutoLoginRef.current.username}?`
                : "Continue to Bilup Accounts?"}
            </h1>
            <p>You're already signed in to Bilup Accounts. Continue to {requestor}?</p>
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
              <p>Bilup Account</p>
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
                href="https://accounts.bilup.org/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://accounts.bilup.org/privacy-policy?from=auth"
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
            <img src="/logo.png" alt="Bilup Accounts" draggable={false} />
          </div>
          <div class={s.welcomeContent}>
            <h1>Welcome to Bilup Accounts</h1>
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
                href="https://accounts.bilup.org/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://accounts.bilup.org/privacy-policy?from=auth"
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
          <AuthHeading>Sign in to Bilup Accounts</AuthHeading>
          <AuthSubheading>Use your Bilup account</AuthSubheading>
          <form class={s.signinForm} onSubmit={handleSigninSubmit}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="username"
                placeholder="Username"
                aria-label="Username"
                autoComplete="username"
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
                aria-label="Password"
                autoComplete="current-password"
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
                href="https://accounts.bilup.org/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://accounts.bilup.org/privacy-policy?from=auth"
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
            One last step before you can use Bilup Accounts. Please read and accept our
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
          <AuthSubheading>Join Bilup Accounts today</AuthSubheading>
          <form onSubmit={handleSignupSubmit}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="username"
                placeholder="Choose a username"
                aria-label="Choose a username"
                autoComplete="username"
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
                aria-label="Email address"
                autoComplete="email"
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
                aria-label="Create password"
                autoComplete="new-password"
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
                aria-label="Confirm password"
                autoComplete="new-password"
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
                href="https://accounts.bilup.org/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://accounts.bilup.org/privacy-policy?from=auth"
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
                aria-label="Email address"
                autoComplete="email"
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
                href="https://accounts.bilup.org/terms-of-service?from=auth"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </a>{" "}
              •{" "}
              <a
                href="https://accounts.bilup.org/privacy-policy?from=auth"
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
