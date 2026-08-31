import { NavLink, Outlet } from 'react-router-dom';
import { CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { SITE_NAV } from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Logo } from './Logo';

/**
 * The site shell: a single column, a bottom tab bar with at most five
 * destinations, and an always visible connection indicator, because a site
 * engineer needs to know whether what they captured has left the device.
 */
export function SiteShell() {
  const { user } = useAuth();
  const { currentProject } = useProject();
  const t = useTranslate();
  const isOnline = useOnlineStatus();

  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-3">
        <Logo markOnly />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink">
            {currentProject?.name ?? t('site.title')}
          </p>
          <p className="truncate text-[10px] text-ink-muted">{user.full_name}</p>
        </div>

        <span
          className={cn(
            'flex items-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-1 text-[10px] font-medium',
            isOnline
              ? 'border-[color-mix(in_srgb,var(--color-status-ontrack)_30%,white)] bg-[color-mix(in_srgb,var(--color-status-ontrack)_12%,white)] text-status-ontrack'
              : 'border-[color-mix(in_srgb,var(--color-status-risk)_30%,white)] bg-[color-mix(in_srgb,var(--color-status-risk)_12%,white)] text-status-risk',
          )}
        >
          {isOnline ? <Cloud className="size-3" aria-hidden /> : <CloudOff className="size-3" aria-hidden />}
          {isOnline ? t('site.online') : t('site.offline')}
        </span>
      </header>

      <main className="flex-1 pb-20">
        <div className="p-3">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label={t('site.title')}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface"
      >
        {SITE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.labelKey}
              to={item.to('')}
              end={item.to('') === '/site'}
              className={({ isActive }) =>
                cn(
                  'touch-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2',
                  'text-[10px] font-medium transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-ink-muted',
                )
              }
            >
              <Icon className="size-5" aria-hidden />
              <span className="max-w-full truncate px-0.5">{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

/** Shown while a queued capture is still waiting to reach the server. */
export function SyncIndicator({ queuedCount }: { queuedCount: number }) {
  const t = useTranslate();
  if (queuedCount === 0) return null;

  return (
    <p className="flex items-center gap-1.5 text-[10px] text-status-risk">
      <RefreshCw className="size-3 animate-spin" aria-hidden />
      {queuedCount} {t('site.queued')}
    </p>
  );
}
