import { Languages } from 'lucide-react';
import { LOCALE_NAMES, useI18n, type Locale } from '@/contexts/I18nContext';
import { LOCALES } from '@/config/constants';

/**
 * The language switcher.
 * Available before sign-in as well as after, because a site supervisor should
 * not have to read English to reach the Tamil interface.
 */
export function LanguagePicker({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={className}>
      <span className="sr-only">{t('profile.language')}</span>
      <span className="relative inline-flex items-center">
        <Languages className="pointer-events-none absolute left-2.5 size-4 text-ink-faint" aria-hidden />
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="h-9 appearance-none rounded-[var(--radius-control)] border border-border bg-surface pl-8 pr-3 text-xs text-ink"
        >
          {LOCALES.map((code) => (
            <option key={code} value={code}>{LOCALE_NAMES[code]}</option>
          ))}
        </select>
      </span>
    </label>
  );
}
