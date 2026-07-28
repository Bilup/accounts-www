import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import s from "./Link.module.css";
import {
  AuthShell,
  AuthSidebar,
  AuthSidebarAction,
  AuthMain,
  AuthLogo,
  AuthHeading,
  AuthSubheading,
  AuthBtnPrimary,
  AuthBtnSecondary,
  AuthNotice,
  AuthTosLinks,
} from "./Shell";
import { setToken, getToken } from "../../lib/auth";

const API_BASE = "https://api.accounts.bilup.org/link";

type Phase = "input" | "verifying" | "redirecting" | "linking" | "done";
type ResultType = "" | "success" | "error";

export function Link() {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [phase, setPhase] = useState<Phase>("input");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultType, setResultType] = useState<ResultType>("");
  const [resultMsg, setResultMsg] = useState("");
  const [subtitle, setSubtitle] = useState(
    "Enter the 6-character code to begin",
  );

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getFullCode = useCallback(
    () => code.map((c) => c.toUpperCase().trim()).join(""),
    [code],
  );

  const showResult = (type: ResultType, message: string) => {
    setResultType(type);
    setResultMsg(message);
  };

  const sendLinkRequest = useCallback(
    async (linkCode: string, token: string) => {
      setPhase("linking");
      setSubtitle("Linking device...");
      try {
        const postUrl =
          API_BASE +
          "/code?code=" +
          encodeURIComponent(linkCode) +
          "&auth=" +
          encodeURIComponent(token);
        const res = await fetch(postUrl, { method: "POST" });
        let data: any = null;
        let rawText = "";
        try {
          rawText = await res.text();
        } catch {}
        try {
          data = rawText ? JSON.parse(rawText) : null;
        } catch {
          data = rawText;
        }

        if (res.ok) {
          const msg =
            typeof data === "string" ? data : "Device linked successfully";
          showResult(
            "success",
            msg +
              " Your session token has been applied. You may close this window.",
          );
          setSubtitle("Device linked");
          setToken(token);
          setPhase("done");
        } else {
          const errMsg =
            data && data.error
              ? data.error
              : "Link failed (HTTP " + res.status + ").";
          const expired =
            typeof errMsg === "string" &&
            errMsg.toLowerCase().includes("no auth code found");
          showResult("error", errMsg || "Invalid code or token. Try again.");
          setSubtitle("Link failed");
          setPhase("input");
          if (expired) {
            setPhase("done");
          }
        }
      } catch (err: any) {
        showResult("error", "Link failed: " + err.message);
        setSubtitle("Link failed");
        setPhase("input");
      }
    },
    [],
  );

  const beginAuth = useCallback(() => {
    setErrorMsg("");
    setResultType("");
    const fullCode = getFullCode();
    if (fullCode.length !== 6) {
      setErrorMsg("Enter the full 6-character code");
      return;
    }
    setPhase("verifying");
    setSubtitle("Verifying code...");
    sessionStorage.setItem("rotur_link_code", fullCode);
    window.location.href =
      "/auth?return_to=" +
      encodeURIComponent(window.location.href.split("?")[0]);
  }, [getFullCode]);

  const beginSignup = useCallback(() => {
    setErrorMsg("");
    setResultType("");
    const fullCode = getFullCode();
    if (fullCode.length !== 6) {
      setErrorMsg("Enter the full 6-character code");
      return;
    }
    setPhase("verifying");
    setSubtitle("Verifying code...");
    sessionStorage.setItem("rotur_link_code", fullCode);
    window.location.href =
      "/auth?signup=1&return_to=" +
      encodeURIComponent(window.location.href.split("?")[0]);
  }, [getFullCode]);

  const handlePaste = async () => {
    try {
      const txt = (await navigator.clipboard.readText())
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      if (!txt) return;
      const newCode = Array(6).fill("");
      for (let i = 0; i < 6; i++) newCode[i] = txt[i] || "";
      setCode(newCode);
      inputRefs.current[Math.min(5, txt.length)]?.focus();
    } catch {
      /* clipboard not available */
    }
  };

  const handleInput = (idx: number, value: string) => {
    const sanitized = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-1);
    const newCode = [...code];
    newCode[idx] = sanitized;
    setCode(newCode);
    if (sanitized && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (newCode.map((c) => c.toUpperCase().trim()).join("").length === 6)
      setErrorMsg("");
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent) => {
    if (e.key === "Backspace" && !code[idx] && idx > 0)
      inputRefs.current[idx - 1]?.focus();
    if (e.key === "Enter") beginAuth();
  };

  // On mount: prefill from ?code=, and if token is available (returning from auth) send link request
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");
    const tokenFromUrl = params.get("token");
    const storedCode = sessionStorage.getItem("rotur_link_code");

    // Clean URL params
    if (tokenFromUrl || codeFromUrl) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.toString());
    }

    // Determine which code to use (URL ?code= takes priority)
    const rawCode = (codeFromUrl || storedCode || "").toUpperCase();

    if (!rawCode) return;

    // Pre-fill the code inputs
    const codeChars = rawCode.split("");
    const newCode = Array(6).fill("");
    codeChars.forEach((c, i) => {
      if (i < 6) newCode[i] = c;
    });
    setCode(newCode);

    // Determine the auth token to use
    const token = tokenFromUrl || getToken();

    if (!token) {
      // No token - user needs to sign in first. Redirect to auth.
      sessionStorage.setItem("rotur_link_code", rawCode);
      window.location.href =
        "/auth?return_to=" +
        encodeURIComponent(window.location.href.split("?")[0]);
      return;
    }

    // We have both code and token - send link request
    sendLinkRequest(rawCode, token);
  }, []);

  const isBusy = phase === "verifying" || phase === "linking";

  const statusCls =
    phase === "verifying" || phase === "linking"
      ? `${s.statusLine} ${s.waiting}`
      : phase === "done" && resultType === "success"
        ? `${s.statusLine} ${s.success}`
        : phase === "done" && resultType === "error"
          ? `${s.statusLine} ${s.error}`
          : s.statusLine;

  const statusText =
    phase === "verifying"
      ? "Verifying code..."
      : phase === "linking"
        ? "Linking device..."
        : "";

  const resultCls =
    resultType === "success"
      ? `${s.resultBox} ${s.resultSuccess}`
      : resultType === "error"
        ? `${s.resultBox} ${s.resultError}`
        : resultType
          ? `${s.resultBox} ${s.resultDefault}`
          : `${s.resultBox} ${s.resultHidden}`;

  return (
    <AuthShell>
      <AuthSidebar
        title="Device Linking"
        subtitle="Connect a console or another device"
        footer={
          <AuthSidebarAction onClick={beginAuth} disabled={isBusy}>
            <i class="fas fa-link" /> Link Device
          </AuthSidebarAction>
        }
      >
        <div class={s.sidebarInfo}>
          <ol>
            <li>
              On the device you want to link, generate or view a 6-character
              code.
            </li>
            <li>
              Enter that code here and sign in (or create an account & accept
              TOS).
            </li>
            <li>We'll securely attach that device to your Bilup account.</li>
          </ol>
          <AuthNotice
            variant="warning"
            icon="fas fa-shield-alt"
            title="Security Tip"
          >
            Only enter codes from devices you physically control. This grants
            full account access.
          </AuthNotice>
        </div>
      </AuthSidebar>

      <AuthMain>
        <AuthLogo />
        <AuthHeading>Link a Device</AuthHeading>
        <AuthSubheading>{subtitle}</AuthSubheading>

        <form
          autocomplete="off"
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div class={s.codeInputRow}>
            {Array.from({ length: 6 }, (_, i) => (
              <input
                key={i}
                ref={(el: any) => {
                  inputRefs.current[i] = el;
                }}
                class={s.codeInput}
                maxlength={1}
                inputmode="latin"
                aria-label={`Code character ${i + 1}`}
                value={code[i]}
                onInput={(e: any) => handleInput(i, e.target.value)}
                onKeyDown={(e: KeyboardEvent) => handleKeyDown(i, e)}
                disabled={isBusy}
              />
            ))}
          </div>
          <div class={s.inlineHelp}>
            Need to sign in first? We'll redirect you automatically.
          </div>
          {errorMsg && <div class={s.errorText}>{errorMsg}</div>}

          <div class={s.linkActions}>
            <AuthBtnPrimary type="button" disabled={isBusy} onClick={beginAuth}>
              {phase === "verifying"
                ? "Verifying..."
                : phase === "linking"
                  ? "Linking..."
                  : "Sign in & Link"}
            </AuthBtnPrimary>
            <AuthBtnSecondary
              type="button"
              disabled={isBusy}
              onClick={handlePaste}
            >
              Paste Code
            </AuthBtnSecondary>
          </div>

          <div class={s.inlineHelp} style={{ marginTop: "6px" }}>
            Don't have an account yet?{" "}
            <button
              type="button"
              class={s.createAccountLink}
              onClick={beginSignup}
              disabled={isBusy}
            >
              Create one
            </button>
          </div>
        </form>

        {(phase === "verifying" || phase === "linking") && (
          <div class={statusCls}>
            <span class={s.statusDot} />
            <span>{statusText}</span>
          </div>
        )}

        <div class={resultCls}>{resultMsg}</div>

        <AuthTosLinks>
          <p>
            By linking you agree to the{" "}
            <a href="/terms-of-service?from=auth">Terms</a> &{" "}
            <a href="/privacy-policy?from=auth">Privacy Policy</a>.
          </p>
        </AuthTosLinks>
      </AuthMain>
    </AuthShell>
  );
}
