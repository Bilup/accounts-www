import { useState, useEffect, useCallback } from "preact/hooks";
import { Gift as GiftIcon, ArrowRight } from "lucide-preact";
import { PageChrome } from "../components/PageChrome";
import { AuthRequired } from "../components/AccountPage";
import { useAuth, getToken, formatDateTime } from "../lib/auth";
import { useI18n } from "../i18n/i18n";
import s from "./Gift.module.css";

const API_BASE_URL = "https://api.accounts.bilup.org";

interface PublicGift {
  code: string;
  amount: number;
  note: string;
  creator_id: string;
  expires_at: number;
}

type Status = "loading" | "ready" | "claimed" | "gone" | "error";

export function Gift({ matches }: { matches?: { code?: string } }) {
  const code = matches?.code || "";
  const { user, isLoggedIn, reload } = useAuth();
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("loading");
  const [gift, setGift] = useState<PublicGift | null>(null);
  const [message, setMessage] = useState("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let live = true;
    setStatus("loading");
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/gifts/${encodeURIComponent(code)}`);
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (res.ok && data.gift) {
          setGift(data.gift);
          setStatus("ready");
        } else {
          setMessage(data.error || "This gift could not be found.");
          setStatus(res.status === 410 ? "gone" : "error");
        }
      } catch {
        if (live) {
          setMessage("Could not reach Bilup Accounts. Try again later.");
          setStatus("error");
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [code]);

  const claim = useCallback(async () => {
    setClaiming(true);
    setMessage("");
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/gifts/claim/${encodeURIComponent(code)}?auth=${encodeURIComponent(token || "")}`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("claimed");
        reload();
      } else {
        setMessage(data.error || "Could not claim this gift.");
        if (res.status === 410) setStatus("gone");
      }
    } catch {
      setMessage("Could not reach Bilup Accounts. Try again later.");
    } finally {
      setClaiming(false);
    }
  }, [code, reload]);

  const amount = gift ? Number(gift.amount).toFixed(2) : "";
  const from = gift?.creator_id || "";
  const isOwnGift = !!user && from.toLowerCase() === user.username.toLowerCase();

  return (
    <PageChrome>
      <div class={s.page}>
        <div class={s.wrapper}>
          <div class={s.card}>
            <div class={s.iconRing}>
              <GiftIcon size={40} />
            </div>

            {status === "loading" && <p class={s.sub}>{t("gift.loading")}</p>}

            {(status === "error" || status === "gone") && (
              <>
                <h1 class={s.title}>{t("gift.unavailable")}</h1>
                <p class={s.sub}>{message}</p>
                <a href="/me" class={s.linkBtn}>
                  {t("gift.goToAccount")}
                </a>
              </>
            )}

            {status === "claimed" && (
              <>
                <h1 class={s.title}>{t("gift.claimed")}</h1>
                <p class={s.sub}>
                  {amount} {t("gift.claimedText")}
                </p>
                <a href="/me" class={s.linkBtn}>
                  {t("gift.viewWallet")} <ArrowRight size={16} />
                </a>
              </>
            )}

            {status === "ready" && gift && (
              <>
                <p class={s.eyebrow}>
                  {from ? (
                    <>
                      <img
                        class={s.avatar}
                        src={`https://avatars.accounts.bilup.org/${from.toLowerCase()}`}
                        alt=""
                      />
                      <span>
                        <strong>@{from}</strong> {t("gift.sentYouGift")}
                      </span>
                    </>
                  ) : (
                    <span>{t("gift.receivedGift")}</span>
                  )}
                </p>
                <div class={s.amount}>{amount}</div>
                <div class={s.credits}>{t("gift.credits")}</div>
                {gift.note && <p class={s.note}>"{gift.note}"</p>}
                {gift.expires_at > 0 && (
                  <p class={s.expiry}>
                    {t("gift.expires")} {formatDateTime(gift.expires_at)}
                  </p>
                )}

                {message && <p class={s.error}>{message}</p>}

                {!isLoggedIn ? (
                  <AuthRequired
                    icon={<GiftIcon size={28} />}
                    title={t("gift.signInToClaim")}
                    text={t("gift.signInToClaimText")}
                    href={`/auth?return_to=${encodeURIComponent(window.location.origin + "/gift/" + code)}`}
                    label={t("gift.signInToClaimBtn")}
                  />
                ) : isOwnGift ? (
                  <p class={s.sub}>{t("gift.cantClaimOwn")}</p>
                ) : (
                  <button
                    type="button"
                    class={s.claimBtn}
                    disabled={claiming}
                    onClick={claim}
                  >
                    {claiming ? t("gift.claiming") : t("gift.claimCredits", { amount })}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
