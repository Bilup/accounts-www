import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer class={s.footer}>
      <div class={s.inner}>
        <div class={s.top}>
          <div class={s.brand}>
            <img src="/logo.png" alt="Bilup Accounts" class={s.brandImg} />
            <span class={s.brandName}>Bilup Accounts</span>
            <span class={s.brandTagline}>Based on <a href="https://rotur.dev">Rotur</a></span>
          </div>
          <div class={s.legal}>
            <a href="/terms-of-service" class={s.legalLink}>
              Terms of Service
            </a>
            <span class={s.dot} />
            <a href="/privacy-policy" class={s.legalLink}>
              Privacy Policy
            </a>
          </div>
        </div>
        <p class={s.copyright}>&copy; 2026 Bilup Accounts. All rights reserved.</p>
      </div>
    </footer>
  );
}
