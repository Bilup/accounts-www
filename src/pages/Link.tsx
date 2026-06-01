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
} from "../components/auth/Shell";
import { setToken } from "../lib/auth";

const API_BASE = "https://api.rotur.dev/link";

type StatusState = "" | "waiting" | "success" | "error";
type ResultType = "" | "success" | "error";

export function Link() {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [errorMsg, setErrorMsg] = useState("");
  const [statusState, setStatusState] = useState<StatusState>("");
  const [statusText, setStatusText] = useState("");
  const [resultType, setResultType] = useState<ResultType>("");
  const [resultMsg, setResultMsg] = useState("");
  const [subtitle, setSubtitle] = useState(
    "Enter the 6-character code to begin",
  );
  const [signInDisabled, setSignInDisabled] = useState(false);
  const [pasteDisabled, setPasteDisabled] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getFullCode = useCallback(
    () => code.map((c) => c.toUpperCase().trim()).join(""),
    [code],
  );

  const clearResult = () => {
    setResultType("");
    setResultMsg("");
  };
  const setStatus = (state: StatusState, text: string) => {
    setStatusState(state);
    setStatusText(text);
  };
  const showResult = (type: ResultType, message: string) => {
    setResultType(type);
    setResultMsg(message);
  };

  const beginAuth = useCallback(() => {
    clearResult();
    const fullCode = getFullCode();
    if (fullCode.length !== 6) {
      setErrorMsg("Enter the full 6-character code");
      return;
    }
    setErrorMsg("");
    sessionStorage.setItem("rotur_link_code", fullCode);
    const returnTo = window.location.href.split("?")[0];
    window.location.href = "/auth?return_to=" + encodeURIComponent(returnTo);
  }, [getFullCode]);

  const beginSignup = useCallback(() => {
    clearResult();
    const fullCode = getFullCode();
    if (fullCode.length !== 6) {
      setErrorMsg("Enter the full 6-character code");
      return;
    }
    setErrorMsg("");
    sessionStorage.setItem("rotur_link_code", fullCode);
    const returnTo = window.location.href.split("?")[0];
    window.location.href =
      "/auth?signup=1&return_to=" + encodeURIComponent(returnTo);
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

  // Handle return from auth (token param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const storedCode = sessionStorage.getItem("rotur_link_code");

    if (token) {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, document.title, url.toString());
    }

    if (!storedCode) return;

    const codeChars = storedCode.split("");
    const newCode = Array(6).fill("");
    codeChars.forEach((c, i) => {
      if (i < 6) newCode[i] = c;
    });
    setCode(newCode);

    if (!token) {
      setErrorMsg("Please sign in to complete device linking.");
      return;
    }

    setSubtitle("Linking device...");
    setSignInDisabled(true);
    setPasteDisabled(true);
    setStatus("waiting", "Sending link request");
    (async () => {
      try {
        const postUrl =
          API_BASE +
          "/code?code=" +
          encodeURIComponent(storedCode) +
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
          setStatus("success", "Linked successfully");
          const msg =
            typeof data === "string" ? data : "Device linked successfully";
          showResult(
            "success",
            msg +
              " Your session token has been applied. You may close this window.",
          );
          setSubtitle("Device linked");
          setToken(token);
        } else {
          const errMsg =
            data && data.error
              ? data.error
              : "Link failed (HTTP " + res.status + ").";
          setStatus("error", "Link failed");
          showResult("error", errMsg || "Invalid code or token. Try again.");
          setSignInDisabled(false);
          setPasteDisabled(false);
          setSubtitle("Enter the 6-character code");
        }
      } catch (err: any) {
        setStatus("error", "Error");
        showResult("error", "Link failed: " + err.message);
        setSignInDisabled(false);
        setPasteDisabled(false);
        setSubtitle("Enter the 6-character code");
      }
    })();
  }, []);

  const statusCls = statusState
    ? `${s.statusLine} ${s[statusState]}`
    : s.statusLine;

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
          <AuthSidebarAction onClick={beginAuth} disabled={signInDisabled}>
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
            <li>We'll securely attach that device to your Rotur account.</li>
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
              />
            ))}
          </div>
          <div class={s.inlineHelp}>
            Need to sign in first? We'll redirect you automatically.
          </div>
          {errorMsg && <div class={s.errorText}>{errorMsg}</div>}

          <div class={s.linkActions}>
            <AuthBtnPrimary
              type="button"
              disabled={signInDisabled}
              onClick={beginAuth}
            >
              Sign in & Link
            </AuthBtnPrimary>
            <AuthBtnSecondary
              type="button"
              disabled={pasteDisabled}
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
            >
              Create one
            </button>
          </div>
        </form>

        {statusState && (
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
