import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import { useTranslate } from '@/contexts/I18nContext';
import { LanguagePicker } from './LanguagePicker';

/**
 * The shell every unauthenticated screen sits inside.
 * A centred card on desktop, full screen with large targets on a phone.
 */
export function AuthLayout({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTranslate();

  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <header className="flex items-center justify-between px-4 py-4">
        <Logo />
        <LanguagePicker />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h1 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h1>
            {subtitle && <p className="measure mt-1 text-xs text-ink-muted">{subtitle}</p>}
            <div className="mt-5">{children}</div>
          </div>
          {footer && <div className="mt-4 text-center text-xs text-ink-muted">{footer}</div>}
        </div>
      </main>

      <footer className="px-4 pb-6 text-center text-2xs text-ink-faint">
        {t('app.name')} · {t('app.tagline')}
      </footer>
    </div>
  );
}
