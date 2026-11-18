// (c) The-Dispatcher
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICTIONARIES, LANGS, type Lang } from "./i18n";

type Overrides = Record<string, Partial<Record<Lang, string>>>;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
  setOverrides: (o: Overrides) => void;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("td_lang");
    if (saved && LANGS.some((l) => l.code === saved)) setLangState(saved as Lang);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("td_lang", l);
  };

  const t = useMemo(
    () => (key: string, fallback?: string) => {
      const override = overrides[key]?.[lang];
      if (override) return override;
      return DICTIONARIES[lang]?.[key] ?? DICTIONARIES.en[key] ?? fallback ?? key;
    },
    [lang, overrides],
  );

  return <I18nCtx.Provider value={{ lang, setLang, t, setOverrides }}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
