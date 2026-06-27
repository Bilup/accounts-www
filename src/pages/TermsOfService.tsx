import { PageChrome } from "../components/PageChrome";
import { TosContent } from "../components/TosContent";
import { useState, useCallback, useRef, useEffect } from "preact/hooks";
import "./TermsOfService.css";

async function callAcceptTosAPI(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.rotur.dev/accept_tos?auth=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    if (response.ok) {
      console.log("Terms of Service acceptance recorded successfully");
      return true;
    } else {
      console.error(
        "Failed to record TOS acceptance:",
        response.status,
        response.statusText,
      );
      return false;
    }
  } catch (error) {
    console.error("Error calling accept_tos API:", error);
    return false;
  }
}

export function TermsOfService() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
  });
  const [returnTo] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("return_to") || sessionStorage.getItem("rotur_return_to");
  });
  const [fromAuth] = useState(() => {
    return new URLSearchParams(window.location.search).get("from") === "auth";
  });
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const termsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (success) return;
    const el = termsRef.current;
    if (!el) return;
    const check = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
        setScrolledToBottom(true);
      }
    };
    check();
    el.addEventListener("scroll", check);
    return () => el.removeEventListener("scroll", check);
  }, [success]);

  // Clean URL on mount (remove token/return_to from address bar, like the HTML version)
  useState(() => {
    const url = new URL(window.location.href);
    const hadToken = url.searchParams.has("token");
    if (hadToken) {
      url.searchParams.delete("token");
      url.searchParams.delete("return_to");
      const fromAuthNow = url.searchParams.get("from") === "auth";
      if (!fromAuthNow) {
        const ref = document.referrer;
        if (ref.includes("auth/index.html") || ref.includes("/auth")) {
          url.searchParams.set("from", "auth");
        }
      }
      window.history.replaceState({}, document.title, url.toString());
    }
  });

  const handleAccept = useCallback(async () => {
    if (!accepted) return;

    if (token) {
      setLoading(true);
      setError(false);
      const ok = await callAcceptTosAPI(token);
      if (ok) {
        setSuccess(true);
        if (fromAuth) {
          setTimeout(() => {
            try {
              window.close();
            } catch {
              /* ignore */
            }
          }, 800);
        } else {
          const authUrl = new URL("/auth", window.location.origin);
          authUrl.searchParams.set("token", token);
          if (returnTo) {
            sessionStorage.setItem("rotur_return_to", returnTo);
            authUrl.searchParams.set("return_to", returnTo);
          }
          setTimeout(() => {
            window.location.href = authUrl.toString();
          }, 1500);
        }
      } else {
        setError(true);
        setLoading(false);
        setTimeout(() => setError(false), 3000);
      }
    } else {
      const returnUrl = encodeURIComponent(window.location.href);
      window.location.href = `/auth?return_to=${returnUrl}`;
    }
  }, [accepted, token, returnTo, fromAuth]);

  const btnText = token
    ? loading
      ? "Accepting Terms..."
      : error
        ? "Error – Try Again"
        : "Accept Terms & Continue"
    : loading
      ? "Accepting Terms..."
      : error
        ? "Error – Try Again"
        : "Accept Terms & Authenticate";

  return (
    <PageChrome className="page">
      <div className="wrapper">
        <p className="title">Terms of Service</p>
        <div className="rule" />
        <p className="sub">
          Please review and accept our terms of service to continue
        </p>

        {!success ? (
          <div className="terms-container">
            <div className="terms-content" ref={termsRef}>
              <TosContent />
            </div>

            {/* Acceptance section */}
            <div className="acceptance-section">
              {!scrolledToBottom && (
                <p
                  className="sub"
                  style={{ marginBottom: "0.75rem", textAlign: "left" }}
                >
                  ⬇️ Please scroll to the bottom of the terms above before
                  accepting.
                </p>
              )}
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={accepted}
                  disabled={!scrolledToBottom}
                  onChange={(e) =>
                    setAccepted((e.target as HTMLInputElement).checked)
                  }
                />
                <label htmlFor="accept-terms">
                  I have read and agree to the Terms of Service. I understand
                  that by checking this box and clicking "Accept Terms", I am
                  entering into a legally binding agreement with Rotur.
                </label>
              </div>
              <button
                className={`btn-accept${loading ? " loading" : ""}${error ? " error" : ""}`}
                disabled={!accepted || !scrolledToBottom || loading}
                onClick={handleAccept}
              >
                {btnText}
              </button>
            </div>

            {/* Contact info */}
            <div className="contact-info">
              <p className="title">Need help?</p>
              <p className="sub">
                Contact us at mistium@icloud.com for any questions about these
                terms.
              </p>
            </div>
          </div>
        ) : fromAuth ? (
          /* Opened from the auth flow - close this tab on success */
          <div className="success-container">
            <p className="title">Terms Accepted!</p>
            <p className="sub">
              You can return to the previous tab - we'll continue signing you in
              automatically.
            </p>
            <div className="token-display">
              This tab will close automatically. You can also close it manually.
            </div>
          </div>
        ) : (
          /* Success state – matches the HTML's #success-container */
          <div className="success-container">
            <p className="title">Terms Accepted Successfully!</p>
            <p className="sub">
              You have successfully accepted the Terms of Service and completed
              authentication.
            </p>
            <div className="token-display">
              <strong>Terms of Service accepted successfully!</strong>
              <br />
              Redirecting you back to continue...
            </div>
            <div className="contact-info">
              <p className="sub">
                You can now safely close this window or proceed to use Rotur
                services.
              </p>
            </div>
          </div>
        )}
      </div>
    </PageChrome>
  );
}
