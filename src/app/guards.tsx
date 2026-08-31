import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usesSiteShell } from '@/lib/auth/permissions';
import { routes } from '@/config/routes';
import { DashboardSkeleton } from '@/components/skeletons';

/**
 * Route guards.
 * Every role lands on the home screen that matches its job: an owner on the
 * company view, a site user on the mobile site shell, everyone else on their
 * project list.
 */

/** The home path for a role, used after sign-in and by the root redirect. */
export function homePathForRole(role: string): string {
  if (role === 'owner' || role === 'accounts') return routes.company;
  if (role === 'site') return routes.site;
  return routes.projects;
}

/** Blocks a route until the user is signed in and has a company membership. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  // Wait for the stored session to resolve before deciding anything, so a
  // signed-in user is never bounced to sign-in on a refresh.
  if (!isReady) return <div className="p-6"><DashboardSkeleton /></div>;

  if (!user) {
    return <Navigate to={routes.signIn} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

/** Sends an already signed-in user away from the sign-in screens. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  if (!isReady) return null;
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;
  return <>{children}</>;
}

/** Routes each role into the shell that fits how they work. */
export function ShellSwitch({
  officeShell, siteShell,
}: {
  officeShell: ReactNode;
  siteShell: ReactNode;
}) {
  const { user } = useAuth();
  if (!user) return null;
  return <>{usesSiteShell(user.role) ? siteShell : officeShell}</>;
}
