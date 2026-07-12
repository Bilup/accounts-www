import type { ComponentChildren } from "preact";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageChrome({
  children,
  className,
  style,
}: {
  children: ComponentChildren;
  className?: string;
  style?: string | Record<string, string | number>;
}) {
  return (
    <div class={className} style={style}>
      {/* Lets keyboard users jump the 6 header links on every page. */}
      <a href="#main" class="skipLink">
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
