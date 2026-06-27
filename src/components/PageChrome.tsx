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
      <Header />
      {children}
      <Footer />
    </div>
  );
}
