import { useState, useEffect } from "preact/hooks";
import s from "./Consent.module.css";

const API = "https://api.accounts.bilup.org";

interface ConsentInfo {
  client_name?: string;
  scope_description?: string;
  scopes?: string[];
  error?: string;
}

export function Consent() {
  const [consentId, setConsentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<ConsentInfo | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("consent_id");
    if (!id) {
      setError("Missing consent_id in URL");
      setLoading(false);
      return;
    }
    setConsentId(id);

    fetch(`${API}/oauth/consent_info?consent_id=${encodeURIComponent(id)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data: ConsentInfo) => {
        if (data.error) {
          setError(data.error);
        } else {
          setInfo(data);
        }
      })
      .catch(() => {
        setError("Failed to load consent information");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAction = (action: "approve" | "deny") => {
    if (!consentId || submitting) return;
    setSubmitting(true);
    setError("");

    fetch(`${API}/oauth/consent`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent_id: consentId,
        action,
      }),
    })
      .then((r) => r.json())
      .then((data: { redirect?: string; error?: string }) => {
        if (data.error) {
          setError(data.error);
          setSubmitting(false);
        } else if (data.redirect) {
          location.href = data.redirect;
        } else {
          setError("No redirect URL returned");
          setSubmitting(false);
        }
      })
      .catch(() => {
        setError("Network error. Please try again.");
        setSubmitting(false);
      });
  };

  return (
    <div class={s.page}>
      <div class={s.card}>
        <div class={s.logo}>
          <img src="/icon.svg" alt="Bilup Accounts" draggable={false} />
        </div>

        <h1 class={s.title}>Authorize access</h1>
        <p class={s.subtitle}>
          <span class={s.clientName}>{info?.client_name || "A third-party application"}</span>{" "}
          would like to access your Bilup Accounts.
        </p>

        {loading && (
          <div class={s.loading}>
            <div class={s.spinner} />
            <span>Loading consent details...</span>
          </div>
        )}

        {!loading && error && !info && (
          <div class={s.section}>
            <div class={s.alert}>
              <i class="fas fa-exclamation-circle" />
              <div>{error}</div>
            </div>
            <div class={s.buttonRow}>
              <button
                type="button"
                class={s.btnSecondary}
                onClick={() => (location.href = "/me")}
              >
                <i class="fas fa-arrow-left" />
                Back to account
              </button>
            </div>
          </div>
        )}

        {!loading && info && (
          <>
            {error && (
              <div class={s.section}>
                <div class={s.alert}>
                  <i class="fas fa-exclamation-circle" />
                  <div>{error}</div>
                </div>
              </div>
            )}

            {info.scope_description || info.scopes ? (
              <div class={s.section}>
                <h2 class={s.sectionTitle}>Requested permissions</h2>
                {info.scopes && info.scopes.length > 0 ? (
                  <ul class={s.scopes}>
                    {info.scopes.map((scope, idx) => (
                      <li key={idx} class={s.scopeItem}>
                        <i class="fas fa-shield-halved" />
                        <span>{scope}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  info.scope_description && (
                    <div class={s.info}>
                      <i class="fas fa-info-circle" />
                      <div>{info.scope_description}</div>
                    </div>
                  )
                )}
              </div>
            ) : null}

            <div class={s.section}>
              <div class={s.info}>
                <i class="fas fa-lock" />
                <div>
                  <strong>Only authorize if you trust this application.</strong>
                  <br />
                  You can revoke access at any time from your account settings.
                </div>
              </div>
            </div>

            <div class={s.buttonRow}>
              <button
                type="button"
                class={s.btnSecondary}
                onClick={() => handleAction("deny")}
                disabled={submitting}
              >
                <i class="fas fa-xmark" />
                {submitting ? "..." : "Deny"}
              </button>
              <button
                type="button"
                class={s.btnPrimary}
                onClick={() => handleAction("approve")}
                disabled={submitting}
              >
                <i class="fas fa-check" />
                {submitting ? "..." : "Authorize"}
              </button>
            </div>
          </>
        )}

        <div class={s.footer}>
          <p class={s.footerLinks}>
            <a
              href="/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
            >
              Terms of Service
            </a>{" "}
            •{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
