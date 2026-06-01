import s from "./Footer.module.css";

export function Footer() {
  return (
    <footer class={s.footer}>
      <div class={s.inner}>
        <div class={s.top}>
          <div class={s.brand}>
            <img src="/Rotur Logo.png" alt="Rotur" class={s.brandImg} />
            <span class={s.brandName}>Rotur</span>
            <span class={s.brandTagline}>- Connecting worlds</span>
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
        <p class={s.copyright}>&copy; 2026 Rotur. All rights reserved.</p>
      </div>
    </footer>
  );
}
