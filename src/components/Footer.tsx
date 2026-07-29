import { useI18n } from "../i18n/i18n";
import s from "./Footer.module.css";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer class={s.footer}>
      <div class={s.inner}>
        <div class={s.top}>
          <div class={s.brand}>
            <img src="/logo.png" alt="Bilup Accounts" class={s.brandImg} />
            <span class={s.brandName}>Bilup Accounts</span>
            <span class={s.brandTagline}>{t("footer.basedOn")} <a href="https://rotur.dev">Rotur</a></span>
          </div>
          <div class={s.legal}>
            <a href="/terms-of-service" class={s.legalLink}>
              {t("footer.termsOfService")}
            </a>
            <span class={s.dot} />
            <a href="/privacy-policy" class={s.legalLink}>
              {t("footer.privacyPolicy")}
            </a>
          </div>
        </div>
        <p class={s.copyright}>{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
