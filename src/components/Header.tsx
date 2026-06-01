import { useState, useEffect } from "preact/hooks";
import { Menu, X, LogIn } from "lucide-preact";
import { useAuth } from "../lib/auth";
import { UserAvatar } from "./UserAvatar";
import s from "./Header.module.css";

const links = [
  { label: "Docs", href: "https://docs.rotur.dev" },
  { label: "Services", href: "/services" },
  { label: "Status", href: "https://status.rotur.dev" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoggedIn } = useAuth();

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const signInHref = `/auth?return_to=${encodeURIComponent(
    window.location.origin + window.location.pathname + window.location.search,
  )}`;

  return (
    <header class={s.header}>
      <div class={s.inner}>
        <a href="/" class={s.logo}>
          <img src="/Rotur Logo.png" alt="Rotur" class={s.logoImg} />
          <span class={s.logoText}>Rotur</span>
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
          <a
            href="https://github.com/roturTW"
            target="_blank"
            rel="noopener noreferrer"
            class={s.navLink}
          >
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.085 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
            </svg>
            GitHub
          </a>

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
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div class={s.mobileMenu}>
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
          <a
            href="https://github.com/roturTW"
            target="_blank"
            rel="noopener noreferrer"
            class={s.mobileLink}
            onClick={() => setMenuOpen(false)}
          >
            GitHub
          </a>
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
