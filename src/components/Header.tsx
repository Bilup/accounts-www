import { useState, useEffect, useRef } from "preact/hooks";
import { Menu, X, LogIn, Sun, Moon, Globe, ChevronDown } from "lucide-preact";
import { useAuth } from "../lib/auth";
import { UserAvatar } from "./UserAvatar";
import { useTheme } from "../hooks/useTheme";
import { useI18n } from "../i18n/i18n";
import s from "./Header.module.css";

const links = [
  { key: "groups", labelKey: "header.groups", href: "/groups" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { user, isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // The open menu scroll-locks the page, so Escape must be able to get out of it.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Close lang dropdown on click outside
  useEffect(() => {
    if (!langOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [langOpen]);

  const signInHref = `/auth?return_to=${encodeURIComponent(
    window.location.origin + window.location.pathname + window.location.search,
  )}`;

  return (
    <header class={s.header}>
      <div class={s.inner}>
        <a href="/" class={s.logo}>
          <img src="/logo.png" alt="Bilup Accounts" class={s.logoImg} />
          <span class={s.logoText}>Bilup Accounts</span>
        </a>

        <nav class={s.desktopNav}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              class={s.navLink}
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {t(l.labelKey)}
            </a>
          ))}

          <div class={s.langWrapper} ref={langRef}>
            <button
              class={s.langToggle}
              onClick={() => setLangOpen(!langOpen)}
              aria-haspopup="true"
              aria-expanded={langOpen}
            >
              <Globe size={16} />
              <span class={s.langLabel}>{lang === "en" ? "EN" : "中文"}</span>
              <ChevronDown size={12} class={`${s.langArrow} ${langOpen ? s.langArrowUp : ""}`} />
            </button>
            {langOpen && (
              <div class={s.langDropdown} role="menu">
                <button
                  class={`${s.langOption} ${lang === "en" ? s.langOptionActive : ""}`}
                  role="menuitem"
                  onClick={() => { setLang("en"); setLangOpen(false); }}
                >
                  English
                </button>
                <button
                  class={`${s.langOption} ${lang === "zh" ? s.langOptionActive : ""}`}
                  role="menuitem"
                  onClick={() => { setLang("zh"); setLangOpen(false); }}
                >
                  中文
                </button>
              </div>
            )}
          </div>

          <button
            class={s.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === "dark" ? t("header.themeDark") : t("header.themeLight")}
            title={theme === "dark" ? t("header.themeDark") : t("header.themeLight")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isLoggedIn && user ? (
            <a href="/me" class={s.userChip} title={`@${user.username}`}>
              <UserAvatar
                username={user.username}
                pfp={user.pfp}
                className={s.userChipImg}
                size={28}
              />
              <span class={s.userChipName}>
                {user.display_name || user.username}
              </span>
            </a>
          ) : (
            <a href={signInHref} class={s.signInBtn}>
              <LogIn size={14} />
              <span>{t("header.signIn")}</span>
            </a>
          )}
        </nav>

        <button
          class={s.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? t("header.closeMenu") : t("header.openMenu")}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div class={s.mobileMenu} id="mobile-menu">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              class={s.mobileLink}
              onClick={() => setMenuOpen(false)}
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {t(l.labelKey)}
            </a>
          ))}
          <div class={s.mobileSection}>
            <span class={s.mobileSectionLabel}>{t("header.language")}</span>
            <div class={s.mobileLangRow}>
              <button
                class={`${s.mobileLangBtn} ${lang === "en" ? s.mobileLangBtnActive : ""}`}
                onClick={() => { setLang("en"); setMenuOpen(false); }}
              >
                English
              </button>
              <button
                class={`${s.mobileLangBtn} ${lang === "zh" ? s.mobileLangBtnActive : ""}`}
                onClick={() => { setLang("zh"); setMenuOpen(false); }}
              >
                中文
              </button>
            </div>
          </div>
          <button
            class={s.mobileThemeToggle}
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? t("header.lightMode") : t("header.darkMode")}</span>
          </button>
          {isLoggedIn && user ? (
            <a
              href="/me"
              class={s.mobileUserChip}
              onClick={() => setMenuOpen(false)}
            >
              <UserAvatar
                username={user.username}
                pfp={user.pfp}
                className={s.mobileUserChipImg}
                size={40}
              />
              <span>{user.display_name || user.username}</span>
            </a>
          ) : (
            <a
              href={signInHref}
              class={s.mobileSignIn}
              onClick={() => setMenuOpen(false)}
            >
              <LogIn size={14} />
              <span>{t("header.signIn")}</span>
            </a>
          )}
        </div>
      )}
    </header>
  );
}
