import { createContext } from "preact";
import { useContext, useState, useEffect, useCallback } from "preact/hooks";
import type { ComponentChildren } from "preact";
import translations from "./translations.json";

export type Lang = "en" | "zh-cn";

// ── Translation dictionaries (loaded from translations.json) ──

const DICTS = translations as Record<Lang, Record<string, Record<string, string>>>;

// ── Context & Provider ──

interface I18nContextValue {
  lang: Lang;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  t: (key: string) => key,
  setLang: () => {},
});

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("bilup-lang");
    if (saved === "zh-cn" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return "en";
}

export function I18nProvider({ children }: { children: ComponentChildren }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem("bilup-lang", lang);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("lang", lang === "zh-cn" ? "zh-CN" : "en");
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = DICTS[lang];
      const parts = key.split(".");
      const ns = parts[0];
      const rest = parts.slice(1).join(".");
      let val = dict[ns]?.[rest];
      if (!val && lang !== "en") {
        // Fallback to English
        val = DICTS.en[ns]?.[rest];
      }
      if (!val) return key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ──

export function useI18n() {
  return useContext(I18nContext);
}
