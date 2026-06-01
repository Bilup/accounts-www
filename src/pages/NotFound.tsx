import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import s from "./NotFound.module.css";

export function NotFound() {
  return (
    <div class={s.page}>
      <Header />
      <main class={s.content}>
        <h1 class={s.title}>404 - Not Found</h1>
        <p class={s.text}>The page you’re looking for does not exist.</p>
        <a href="/" class={s.homeLink}>
          Go Home
        </a>
      </main>
      <Footer />
    </div>
  );
}
