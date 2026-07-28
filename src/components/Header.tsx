import { useState, useEffect } from "preact/hooks";
import { Menu, X, LogIn, Sun, Moon } from "lucide-preact";
import { useAuth } from "../lib/auth";
import { UserAvatar } from "./UserAvatar";
import { useTheme } from "../hooks/useTheme";
import s from "./Header.module.css";

const links = [
  { label: "Groups", href: "/groups" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoggedIn } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
              key={l.label}
              href={l.href}
              class={s.navLink}
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {l.label}
            </a>
          ))}

          <button
            class={s.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
              <span>Sign in</span>
            </a>
          )}
        </nav>

        <button
          class={s.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
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
              key={l.label}
              href={l.href}
              class={s.mobileLink}
              onClick={() => setMenuOpen(false)}
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {l.label}
            </a>
          ))}
          <button
            class={s.mobileThemeToggle}
            onClick={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
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
              <span>Sign in</span>
            </a>
          )}
        </div>
      )}
    </header>
  );
}
