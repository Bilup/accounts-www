import type { ComponentChildren } from "preact";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { useI18n } from "../i18n/i18n";

export function PageChrome({
  children,
  className,
  style,
}: {
  children: ComponentChildren;
  className?: string;
  style?: string | Record<string, string | number>;
}) {
  const { t } = useI18n();
  return (
    <div class={className} style={style}>
      {/* Lets keyboard users jump the 6 header links on every page. */}
      <a href="#main" class="skipLink">
        {t("pageChrome.skipToContent")}
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
