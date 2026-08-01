import { useState, useEffect } from "preact/hooks";
import s from "./Consent.module.css";
import { useI18n } from "../i18n/i18n";

const API = "https://api.accounts.bilup.org";

interface ConsentInfo {
  client_name?: string;
  scope_description?: string;
  scopes?: string[];
  error?: string;
}

export function Consent() {
  const { t } = useI18n();
  const [consentId, setConsentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<ConsentInfo | null>(null);
  // `error` holds a raw backend error message; `errorKey` holds a translation
  // key for known client-side errors. We translate the key at render time so
  // the message reacts to language changes without re-fetching.
  const [error, setError] = useState<string>("");
  const [errorKey, setErrorKey] = useState<string>("");

  const showError = (key: string) => {
    setError("");
    setErrorKey(key);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("consent_id");
    if (!id) {
      showError("consent.missingConsentId");
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
          setErrorKey("");
        } else {
          setInfo(data);
        }
      })
      .catch(() => {
        showError("consent.failedLoad");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleAction = (action: "approve" | "deny") => {
    if (!consentId || submitting) return;
    setSubmitting(true);
    setError("");
    setErrorKey("");

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
          showError("consent.noRedirect");
          setSubmitting(false);
        }
      })
      .catch(() => {
        showError("consent.networkError");
        setSubmitting(false);
      });
  };

  const errorMessage = error || (errorKey ? t(errorKey) : "");

  return (
    <div class={s.page}>
      <div class={s.card}>
        <div class={s.logo}>
          <img src="/logo.png" alt="Bilup Accounts" draggable={false} />
        </div>

        <h1 class={s.title}>{t("consent.title")}</h1>
        <p class={s.subtitle}>
          <span class={s.clientName}>
            {info?.client_name || t("consent.thirdPartyApp")}
          </span>{" "}
          {t("consent.wouldLikeAccess")}
        </p>

        {loading && (
          <div class={s.loading}>
            <div class={s.spinner} />
            <span>{t("consent.loading")}</span>
          </div>
        )}

        {!loading && errorMessage && !info && (
          <div class={s.section}>
            <div class={s.alert}>
              <i class="fas fa-exclamation-circle" />
              <div>{errorMessage}</div>
            </div>
            <div class={s.buttonRow}>
              <button
                type="button"
                class={s.btnSecondary}
                onClick={() => (location.href = "/me")}
              >
                <i class="fas fa-arrow-left" />
                {t("consent.backToAccount")}
              </button>
            </div>
          </div>
        )}

        {!loading && info && (
          <>
            {errorMessage && (
              <div class={s.section}>
                <div class={s.alert}>
                  <i class="fas fa-exclamation-circle" />
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {info.scope_description || info.scopes ? (
              <div class={s.section}>
                <h2 class={s.sectionTitle}>{t("consent.requestedPermissions")}</h2>
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
                  <strong>{t("consent.trustWarning")}</strong>
                  <br />
                  {t("consent.revokeInfo")}
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
                {submitting ? "..." : t("consent.deny")}
              </button>
              <button
                type="button"
                class={s.btnPrimary}
                onClick={() => handleAction("approve")}
                disabled={submitting}
              >
                <i class="fas fa-check" />
                {submitting ? "..." : t("consent.authorize")}
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
              {t("footer.termsOfService")}
            </a>{" "}
            •{" "}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("footer.privacyPolicy")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
