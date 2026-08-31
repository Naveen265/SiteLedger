import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, User, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { COMPANY_NAV, PROJECT_NAV, navItemsForRole } from '@/config/navigation';
import { routes } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { roleLabelKey } from '@/lib/auth/permissions';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from './Logo';
import { ProjectSwitcher } from './ProjectSwitcher';
import { useUnreadCount } from '@/modules/notifications/hooks/useNotifications';

/**
 * The office shell: persistent left navigation, a project switcher in the
 * header, and content capped at 1440px. Used by every role except site.
 */
export function OfficeShell() {
  const { user, signOut } = useAuth();
  const { currentProjectId } = useProject();
  const t = useTranslate();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!user) return null;

  const companyItems = navItemsForRole(COMPANY_NAV, user.role);
  const projectItems = navItemsForRole(PROJECT_NAV, user.role);

  /** One navigation link, shared by the sidebar and the mobile drawer. */
  const renderLink = (
    item: (typeof PROJECT_NAV)[number],
    disabled = false,
  ) => {
    const Icon = item.icon;
    const to = item.to(currentProjectId ?? '');

    if (disabled) {
      return (
        <span
          key={item.labelKey}
          className="flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-xs text-ink-faint"
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {t(item.labelKey)}
        </span>
      );
    }

    return (
      <NavLink
        key={item.labelKey}
        to={to}
        onClick={() => setIsMobileNavOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-xs transition-colors duration-150',
            isActive
              ? 'bg-primary-subtle font-medium text-primary'
              : 'text-ink-muted hover:bg-surface-subtle hover:text-ink',
          )
        }
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {t(item.labelKey)}
      </NavLink>
    );
  };

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-3" aria-label={t('nav.projects')}>
      {companyItems.map((item) => renderLink(item))}

      {projectItems.length > 0 && (
        <>
          <hr className="my-2 border-border" />
          {/* Project scoped links are inert until a project is selected. */}
          {projectItems.map((item) => renderLink(item, !currentProjectId))}
        </>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-3 lg:px-4">
        <IconButton
          label={t('nav.more')}
          icon={isMobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          onClick={() => setIsMobileNavOpen((open) => !open)}
          className="lg:hidden"
        />

        <NavLink to={routes.projects} className="shrink-0">
          <Logo className="hidden sm:block" />
          <Logo markOnly className="sm:hidden" />
        </NavLink>

        <div className="ml-2 hidden md:block">
          <ProjectSwitcher />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <IconButton
              label={t('nav.notifications')}
              icon={<Bell className="size-4.5" />}
              onClick={() => navigate(routes.notifications)}
            />
            {unreadCount > 0 && (
              <span className="tabular pointer-events-none absolute right-1 top-1 min-w-4 rounded-full bg-status-delayed px-1 text-center text-[10px] font-semibold leading-4 text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          <IconButton
            label={t('nav.profile')}
            icon={<User className="size-4.5" />}
            onClick={() => navigate(routes.profile)}
          />

          <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 sm:flex">
            <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
            <div className="leading-tight">
              <p className="text-2xs font-medium text-ink">{user.full_name}</p>
              <p className="text-[10px] text-ink-muted">{t(roleLabelKey(user.role, user.site_level))}</p>
            </div>
          </div>

          <IconButton
            label={t('auth.signOut')}
            icon={<LogOut className="size-4.5" />}
            onClick={() => void signOut()}
          />
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-surface lg:block">
          {sidebar}
        </aside>

        {isMobileNavOpen && (
          <>
            <div
              className="fixed inset-0 top-14 z-20 bg-ink/40 lg:hidden"
              onClick={() => setIsMobileNavOpen(false)}
              aria-hidden
            />
            <aside className="fixed inset-y-14 left-0 z-30 w-64 border-r border-border bg-surface lg:hidden">
              <div className="border-b border-border p-3 md:hidden">
                <ProjectSwitcher />
              </div>
              {sidebar}
            </aside>
          </>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] p-3 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
