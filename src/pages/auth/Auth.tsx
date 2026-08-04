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
import { useI18n } from "../../i18n/i18n";
import { CAPTCHA_SITE_KEY } from "../../lib/captcha";

declare const turnstile: any;

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
  const { t } = useI18n();
  const [view, setView] = useState<View>("welcome");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [gateErrorId, setGateErrorId] = useState<string>("");

  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siBtn, setSiBtn] = useState<BtnState>(defaultBtn(t("auth.signIn")));

  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suBtn, setSuBtn] = useState<BtnState>(defaultBtn(t("auth.createAccount")));
  const captchaRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<string | null>(null);
  const forgotCaptchaRef = useRef<HTMLDivElement | null>(null);
  const forgotCaptchaWidgetIdRef = useRef<string | null>(null);

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
    defaultBtn(t("auth.sendResetLink")),
  );
  const [forgotMsg, setForgotMsg] = useState<string>("");

  const [resetToken, setResetToken] = useState("");
  const [resetNewPw, setResetNewPw] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBtn, setResetBtn] = useState<BtnState>(
    defaultBtn(t("auth.resetPassword")),
  );
  const [resetMsg, setResetMsg] = useState<string>("");

  // Scope-aware auth state
  const returnToRef = useRef<string>("https://accounts.bilup.org/me");
  const systemNameRef = useRef<string>("web");
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
  const [scopeBtn, setScopeBtn] = useState<BtnState>(defaultBtn(t("auth.allow")));
  const [scopeError, setScopeError] = useState("");
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

  const sidebar = useMemo(() => sidebarForView[view], [view]);
  const addBtnText = view === "welcome" ? t("auth.useAnotherAccountBtn") : t("auth.back");
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
    const errorParam = params.get("error");
    if (errorParam) setGateErrorId(decodeURIComponent(errorParam));
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
            setTimeout(() => setSiBtn(defaultBtn(t("auth.signInDefaultBtn"))), 4000);
            return;
          }
          handleAccountLogin(data);
        })
        .catch(() => {
          setSiBtn(errorBtn(t("auth.googleSignInFailed")));
          setTimeout(() => setSiBtn(defaultBtn(t("auth.signInDefaultBtn"))), 4000);
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
    setSiBtn(defaultBtn(t("auth.signInDefaultBtn")));
  }, []);

  const showSignUpForm = useCallback(() => {
    setView("signup");
    setSuUsername("");
    setSuEmail("");
    setSuPassword("");
    setSuConfirm("");
    setSuBtn(defaultBtn(t("auth.createAccountDefaultBtn")));
  }, []);

  const showWelcome = useCallback(() => {
    setView("welcome");
  }, []);

  const showForgot = useCallback(() => {
    setView("forgot");
    setForgotEmail(getCookie("username") || "");
    setForgotMsg("");
    setForgotBtn(defaultBtn(t("auth.sendResetLinkDefaultBtn")));
  }, []);

  const showReset = useCallback((prefillToken = "") => {
    setView("reset");
    setResetToken(prefillToken);
    setResetNewPw("");
    setResetConfirm("");
    setResetMsg("");
    setResetBtn(defaultBtn(t("auth.resetPasswordDefaultBtn")));
  }, []);

  const handleForgotSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const email = forgotEmail.trim();
      if (!email || !isValidEmail(email)) {
        flashBtn(
          setForgotBtn,
          t("auth.sendResetLinkDefaultBtn"),
          errorBtn(t("auth.emailRequiredError")),
        );
        return;
      }
      const captchaToken =
        typeof turnstile !== "undefined" &&
        forgotCaptchaWidgetIdRef.current !== null
          ? turnstile.getResponse(forgotCaptchaWidgetIdRef.current)
          : "";
      if (!captchaToken) {
        flashBtn(
          setForgotBtn,
          t("auth.sendResetLinkDefaultBtn"),
          errorBtn(t("auth.completeCaptcha")),
        );
        return;
      }
      setForgotMsg("");
      setForgotBtn(loadingBtn(t("auth.sending")));
      try {
        const res = await fetch(`${API}/auth/request_reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, captcha: captchaToken }),
        });
        const data = await res.json().catch(() => ({}) as any);
        if (typeof turnstile !== "undefined")
          turnstile.reset(forgotCaptchaWidgetIdRef.current);
        if (res.status === 429) {
          flashBtn(
            setForgotBtn,
            t("auth.sendResetLinkDefaultBtn"),
            errorBtn(
              data.error || t("auth.waitBeforeReset"),
            ),
          );
          return;
        }
        setForgotBtn(
          successBtn(t("auth.resetEmailSent")),
        );
        setForgotMsg(
          data.message ||
            t("auth.resetEmailSentFull"),
        );
      } catch {
        if (typeof turnstile !== "undefined")
          turnstile.reset(forgotCaptchaWidgetIdRef.current);
        setForgotBtn(
          successBtn(t("auth.resetEmailSent")),
        );
        setForgotMsg(
          t("auth.resetEmailSentFull"),
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
          t("auth.resetPasswordDefaultBtn"),
          errorBtn(t("auth.resetCodeRequired")),
        );
        setResetMsg(t("auth.resetCodeRequired"));
        return;
      }
      if (resetNewPw.length < 8) {
        flashBtn(
          setResetBtn,
          t("auth.resetPasswordDefaultBtn"),
          errorBtn(t("auth.password8Chars")),
        );
        setResetMsg(t("auth.passwordLengthError"));
        return;
      }
      if (resetNewPw !== resetConfirm) {
        flashBtn(
          setResetBtn,
          t("auth.resetPasswordDefaultBtn"),
          errorBtn(t("auth.passwordsDoNotMatch")),
        );
        setResetMsg(t("auth.passwordsDontMatch"));
        return;
      }
      setResetMsg("");
      setResetBtn(loadingBtn(t("auth.resetting")));
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
            t("auth.resetPasswordDefaultBtn"),
            errorBtn(data.error || t("auth.failedToReset")),
          );
          setResetMsg(data.error || t("auth.failedToReset"));
          return;
        }
        setResetBtn(successBtn(t("auth.passwordReset")));
        setResetMsg(
          data.message || t("auth.passwordResetMsg"),
        );
        setTimeout(() => {
          setSiUsername(getCookie("username") || "");
          setSiPassword("");
          setSiBtn(defaultBtn(t("auth.signInDefaultBtn")));
          setView("signin");
        }, 1500);
      } catch {
        flashBtn(
          setResetBtn,
          t("auth.resetPasswordDefaultBtn"),
          errorBtn(t("auth.networkError")),
        );
        setResetMsg(t("auth.networkError"));
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
      setSiBtn(loadingBtn(t("auth.signingIn")));

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
          setSiBtn(defaultBtn(t("auth.signIn")));
        } else if ((data as any).requiresEmailVerification) {
          pendingVerificationRef.current = {
            token: (data as any).token,
            username: (data as any).username,
            email: (data as any).email || "",
          };
          setView("verify");
          setVerifyMsg("");
          setSiBtn(defaultBtn(t("auth.signIn")));
        } else {
          flashBtn(
            setSiBtn,
            t("auth.signIn"),
            errorBtn(data.error || t("auth.invalidCredentials")),
          );
        }
      } catch {
        flashBtn(setSiBtn, t("auth.signIn"), errorBtn(t("auth.errorOccurred")));
      }
    },
    [siUsername, siPassword, handleAccountLogin],
  );

  const handleSignupSubmit = useCallback(
    async (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      const captchaToken =
        typeof turnstile !== "undefined" && captchaWidgetIdRef.current !== null
          ? turnstile.getResponse(captchaWidgetIdRef.current)
          : "";

      if (!captchaToken) {
        flashBtn(setSuBtn, t("auth.createAccount"), errorBtn(t("auth.completeCaptcha")));
        return;
      }
      if (suPassword !== suConfirm) {
        flashBtn(
          setSuBtn,
          t("auth.createAccount"),
          errorBtn(t("auth.passwordsDoNotMatch")),
        );
        if (typeof turnstile !== "undefined")
          turnstile.reset(captchaWidgetIdRef.current);
        return;
      }
      if (suPassword.length < 8) {
        flashBtn(
          setSuBtn,
          t("auth.createAccount"),
          errorBtn(t("auth.password8Chars")),
        );
        if (typeof turnstile !== "undefined")
          turnstile.reset(captchaWidgetIdRef.current);
        return;
      }

      setSuBtn(loadingBtn(t("auth.creating")));

      try {
        const res = await fetch(`${API}/create_user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: suUsername,
            email: suEmail,
            password: suPassword,
            system: systemNameRef.current,
            captcha: captchaToken,
          }),
        });
        const result = await res.json();

        if (result.error) {
          if (typeof turnstile !== "undefined")
            turnstile.reset(captchaWidgetIdRef.current);
          flashBtn(setSuBtn, t("auth.createAccount"), errorBtn(result.error));
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
            setSuBtn(defaultBtn(t("auth.createAccount")));
          } else {
            flashBtn(
              setSuBtn,
              t("auth.createAccount"),
              successBtn(t("auth.accountCreated")),
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
        if (typeof turnstile !== "undefined")
          turnstile.reset(captchaWidgetIdRef.current);
        flashBtn(setSuBtn, t("auth.createAccountDefaultBtn"), errorBtn(t("auth.errorOccurred")));
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
        setVerifyMsg(t("auth.emailNotVerified"));
      }
    } catch {
      setVerifyMsg(t("auth.errorCheckVerification"));
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
      setVerifyMsg(data.message || t("auth.verificationEmailSent"));
    } catch {
      setVerifyMsg(t("auth.failedResendEmail"));
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
          errorBtn(t("auth.notAcceptedYet")),
        );
      }
    } catch {
      flashBtn(setTosBtn, "", errorBtn(t("auth.networkError")));
    }
  }, [handleAccountLogin]);

  const handleTosAccept = useCallback(async () => {
    const pending = pendingTosRef.current;
    if (!pending || !tosCheckboxChecked) return;
    setTosBtn(loadingBtn(t("auth.accepting")));
    try {
      const res = await fetch(
        `${API}/accept_tos?auth=${encodeURIComponent(pending.token)}`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (res.ok) {
        setTosAccepted(true);
        setTosBtn(successBtn(t("auth.accepted")));
        setTimeout(() => handleTosContinue(), 800);
      } else {
        flashBtn(
          setTosBtn,
          t("auth.acceptTermsDefaultBtn"),
          errorBtn(t("auth.failedAccept")),
        );
      }
    } catch {
      flashBtn(
        setTosBtn,
        t("auth.acceptTermsDefaultBtn"),
        errorBtn(t("auth.networkError")),
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
      setScopeBtn(loadingBtn(t("auth.creatingToken")));
      try {
        const res = await fetch(
          `${API}/tokens/create?auth=${encodeURIComponent(account.key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: requestor || t("auth.thirdPartyAppName"),
              permissions: perms,
              origin: requestor,
              description: t("auth.scopedAccessDesc", { requestor }),
              websites: [returnToRef.current],
            }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setScopeBtn(errorBtn(data.error || t("tokens.failedCreate")));
          setTimeout(() => setScopeBtn(defaultBtn(t("auth.allowDefaultBtn"))), 3000);
          return;
        }
        saveAccountToStorage(account);
        deliverAuthToken(data.token as string, {
          scope: "scoped",
          permissions: perms,
          id: data.id,
        });
      } catch (e: any) {
        setScopeBtn(errorBtn(e?.message || t("notifications.networkError")));
        setTimeout(() => setScopeBtn(defaultBtn(t("auth.allowDefaultBtn"))), 3000);
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
        typeof turnstile !== "undefined"
      ) {
        try {
          turnstile.reset(captchaWidgetIdRef.current);
        } catch {}
      }
      return;
    }

    let cancelled = false;

    const tryRender = () => {
      if (cancelled) return;
      const el = captchaRef.current;
      if (!el) return;
      if (typeof turnstile === "undefined") {
        setTimeout(tryRender, 100);
        return;
      }
      if (captchaWidgetIdRef.current !== null) {
        try {
          turnstile.remove(captchaWidgetIdRef.current);
        } catch {}
        captchaWidgetIdRef.current = null;
      }
      try {
        captchaWidgetIdRef.current = turnstile.render(el, {
          sitekey: CAPTCHA_SITE_KEY,
        });
      } catch {}
    };

    tryRender();

    return () => {
      cancelled = true;
      if (
        captchaWidgetIdRef.current !== null &&
        typeof turnstile !== "undefined"
      ) {
        try {
          turnstile.remove(captchaWidgetIdRef.current);
        } catch {}
        captchaWidgetIdRef.current = null;
      }
    };
  }, [view]);

  useEffect(() => {
    if (view !== "forgot") {
      if (
        forgotCaptchaWidgetIdRef.current !== null &&
        typeof turnstile !== "undefined"
      ) {
        try {
          turnstile.reset(forgotCaptchaWidgetIdRef.current);
        } catch {}
      }
      return;
    }

    let cancelled = false;

    const tryRender = () => {
      if (cancelled) return;
      const el = forgotCaptchaRef.current;
      if (!el) return;
      if (typeof turnstile === "undefined") {
        setTimeout(tryRender, 100);
        return;
      }
      if (forgotCaptchaWidgetIdRef.current !== null) {
        try {
          turnstile.remove(forgotCaptchaWidgetIdRef.current);
        } catch {}
        forgotCaptchaWidgetIdRef.current = null;
      }
      try {
        forgotCaptchaWidgetIdRef.current = turnstile.render(el, {
          sitekey: CAPTCHA_SITE_KEY,
        });
      } catch {}
    };

    tryRender();

    return () => {
      cancelled = true;
      if (
        forgotCaptchaWidgetIdRef.current !== null &&
        typeof turnstile !== "undefined"
      ) {
        try {
          turnstile.remove(forgotCaptchaWidgetIdRef.current);
        } catch {}
        forgotCaptchaWidgetIdRef.current = null;
      }
    };
  }, [view]);

  return (
    <AuthShell>
      <AuthSidebar
        title={t(sidebar.title)}
        subtitle={t(sidebar.sub)}
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
              ? t("auth.useAnotherAccountBtn")
              : view === "forgot" || view === "reset"
                ? t("auth.backToSignInBtn")
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
              <p>{t("auth.bilupAccount")}</p>
            </div>
          </button>
        ) : savedAccounts.length === 0 ? (
          <div class={s.noAccounts}>
            <div class={s.noAccountsIcon}>
              <i class="fas fa-user-circle" />
            </div>
            <p class={s.noAccountsTitle}>{t("auth.noSavedAccounts")}</p>
            <p class={s.noAccountsSub}>{t("auth.signInToSave")}</p>
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
                    ? t("auth.clickToSignIn")
                    : t("auth.clickToSignInPw")
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
                      ? t("auth.quickSignInBusy")
                      : t("auth.clickToSignIn")
                    : t("auth.bilupAccount")}
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
                title={t("auth.removeUserTitle", { username: a.username })}
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
                ? t("auth.continueAsName", { name: pendingAutoLoginRef.current.username })
                : t("auth.continueTo")}
            </h1>
            <p>{t("auth.alreadySignedInTo", { requestor })}</p>
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
              <h3>{pendingAutoLoginRef.current?.username || t("auth.yourAccount")}</h3>
              <p>{t("auth.bilupAccount")}</p>
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
              <i class="fas fa-user-group" /> {t("auth.useAnother")}
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
            <h1>{t("auth.welcome")}</h1>
            <p>{t("auth.welcomeSub")}</p>
          </div>
          {gateErrorId && (
            <div class={s.gateErrorBanner}>
              <i class="fas fa-exclamation-triangle" />
              <span>{gateErrorId}</span>
            </div>
          )}
          <div class={s.welcomeButtons}>
            <button
              class={s.btnWelcomePrimary}
              onClick={() => showSignInForm()}
            >
              <i class="fas fa-sign-in-alt" /> {t("auth.signIn")}
            </button>
            <button class={s.btnWelcomeSecondary} onClick={showSignUpForm}>
              <i class="fas fa-user-plus" /> {t("auth.createAccount")}
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
          <AuthHeading>{t("auth.signInToBilup")}</AuthHeading>
          <AuthSubheading>{t("auth.useYourAccount")}</AuthSubheading>
          <form class={s.signinForm} onSubmit={handleSigninSubmit}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="username"
                placeholder={t("auth.username")}
                aria-label={t("auth.username")}
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
                placeholder={t("auth.password")}
                aria-label={t("auth.password")}
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
                {t("auth.forgotPassword")}
              </AuthTosLinkBtn>
            </p>
            <p>
              {t("auth.noAccount")}{" "}
              <AuthTosLinkBtn onClick={showSignUpForm}>
                {t("auth.createOne")}
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
          <AuthHeading>{t("auth.verifyTitle")}</AuthHeading>
          <AuthSubheading>
            {t("auth.verifySub")}{" "}
            <strong>
              {pendingVerificationRef.current?.email ||
                pendingVerificationRef.current?.username ||
                "your email"}
            </strong>
            . {t("auth.verifySub2")}
          </AuthSubheading>
          <p class={s.verifyInstruction}>
            {t("auth.verifyInstruction")}
          </p>
          <div class={s.verifyBtns}>
            <AuthBtnPrimary onClick={handleVerifyDone}>
              {t("auth.verifiedContinue")}
            </AuthBtnPrimary>
            <AuthBtnSecondary onClick={handleVerifyResend}>
              {t("auth.resendEmail")}
            </AuthBtnSecondary>
            <AuthBtnSecondary onClick={handleVerifyCancel}>
              {t("auth.cancel")}
            </AuthBtnSecondary>
          </div>
          {verifyMsg && <div class={s.verifyMsg}>{verifyMsg}</div>}
        </AuthMain>
      ) : view === "tos" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>{t("auth.acceptTOS")}</AuthHeading>
          <AuthSubheading>{t("auth.acceptTOSSub")}</AuthSubheading>
          <div ref={tosContentRef} class={s.tosFrameContent}>
            <TosContent />
          </div>
          {!tosScrolledToBottom && (
            <p class={s.tosScrollHint}>
              <i class="fas fa-arrow-down" /> {t("auth.scrollToAcceptHint")}
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
            {t("auth.agreeToTOS")}
          </label>
          <div class={s.verifyBtns}>
            <AuthBtnPrimary
              onClick={handleTosAccept}
              disabled={tosBtn.disabled || tosAccepted || !tosCheckboxChecked}
              style={tosBtn.color ? { background: tosBtn.color } : undefined}
            >
              {tosBtn.text || (
                <>
                  <i class="fas fa-check" /> {t("auth.acceptTerms")}
                </>
              )}
            </AuthBtnPrimary>
          </div>
        </AuthMain>
      ) : view === "signup" ? (
        <AuthMain>
          <AuthLogo />
          <AuthHeading>{t("auth.createAccountTitle")}</AuthHeading>
          <AuthSubheading>{t("auth.joinBilup")}</AuthSubheading>
          <form onSubmit={handleSignupSubmit}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="username"
                placeholder={t("auth.chooseUsername")}
                aria-label={t("auth.chooseUsername")}
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
                placeholder={t("auth.emailAddress")}
                aria-label={t("auth.emailAddress")}
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
                placeholder={t("auth.createPassword")}
                aria-label={t("auth.createPassword")}
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
                placeholder={t("auth.confirmPassword")}
                aria-label={t("auth.confirmPassword")}
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
              {t("auth.haveAccount")}{" "}
              <AuthTosLinkBtn onClick={() => showSignInForm()}>
                {t("auth.signInLink")}
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
          <AuthHeading>{t("auth.forgotTitle")}</AuthHeading>
          <AuthSubheading>{t("auth.forgotSub")}</AuthSubheading>
          <form onSubmit={handleForgotSubmit} class={s.signinForm}>
            <AuthFormGroup>
              <AuthInput
                type="email"
                name="email"
                placeholder={t("auth.emailAddress")}
                aria-label={t("auth.emailAddress")}
                autoComplete="email"
                required
                value={forgotEmail}
                onInput={(e: any) => setForgotEmail(e.target.value)}
              />
            </AuthFormGroup>
            <div class={s.formGroup} style={{ marginTop: "0.75rem" }}>
              <div ref={forgotCaptchaRef} />
            </div>
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
              {t("auth.remembered")}{" "}
              <AuthTosLinkBtn onClick={() => showSignInForm()}>
                {t("auth.backToSignIn")}
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
          <AuthHeading>{t("auth.setNewPassword")}</AuthHeading>
          <AuthSubheading>
            {t("auth.resetSub")}
          </AuthSubheading>
          <form onSubmit={handleResetSubmit} class={s.signinForm}>
            <AuthFormGroup>
              <AuthInput
                type="text"
                name="reset-token"
                placeholder={t("auth.resetCode")}
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
                placeholder={t("auth.newPasswordPlaceholder")}
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
                placeholder={t("auth.confirmNewPasswordPlaceholder")}
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
                {t("auth.didntGetEmail")}
              </AuthTosLinkBtn>
            </p>
            <p>
              <AuthTosLinkBtn onClick={() => showSignInForm()}>
                {t("auth.backToSignIn")}
              </AuthTosLinkBtn>
            </p>
          </AuthTosLinks>
        </AuthMain>
      ) : null}
    </AuthShell>
  );
}
