import { PageChrome } from "../components/PageChrome";
import { useI18n } from "../i18n/i18n";
import s from "./NotFound.module.css";

export function NotFound() {
  const { t } = useI18n();
  return (
    <PageChrome>
      <div class={s.page}>
        <main class={s.content}>
          <h1 class={s.title}>{t("notFound.title")}</h1>
          <p class={s.text}>{t("notFound.text")}</p>
          <a href="/" class={s.homeLink}>
            {t("notFound.goHome")}
          </a>
        </main>
      </div>
    </PageChrome>
  );
}
