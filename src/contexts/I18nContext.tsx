import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALES } from '@/config/constants';
import en from '@/i18n/messages/en.json';
import ta from '@/i18n/messages/ta.json';
import hi from '@/i18n/messages/hi.json';

/**
 * Interface language.
 * No user-facing string is ever hardcoded in a component. Every label resolves
 * through `t`, so a Tamil user sees Tamil everywhere, not in patches.
 */

export type Locale = (typeof LOCALES)[number];
type Messages = Record<string, unknown>;

const MESSAGES: Record<Locale, Messages> = { en, ta, hi };

/** Human names for the language switcher, each written in its own script. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
};

/** Reads a dotted key path out of a nested message object. */
function lookup(messages: Messages, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Messages)[part] : undefined),
    messages,
  );
  return typeof value === 'string' ? value : undefined;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Resolves a key to a string, substituting {name} placeholders. */
  t: (key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'siteledger.locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return LOCALES.includes(stored as Locale) ? (stored as Locale) : DEFAULT_LOCALE;
  });

  // The html lang attribute drives font fallback and screen reader pronunciation.
  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  /** Switches language for this device. */
  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  /**
   * Resolves a message key. Falls back to English when a key is missing from a
   * translation, and to the key itself when it is missing everywhere, so a
   * missing string is visible in development rather than rendering as blank.
   */
  const t = useCallback(
    (key: string, values?: Record<string, string | number>) => {
      const template = lookup(MESSAGES[locale], key) ?? lookup(MESSAGES.en, key) ?? key;
      if (!values) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match,
      );
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Reads the i18n context. Throws if used outside the provider. */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}

/** Shorthand for components that only need the translate function. */
export function useTranslate() {
  return useI18n().t;
}
