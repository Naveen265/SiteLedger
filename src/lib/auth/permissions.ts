import type { Role, SiteLevel } from '@/types/enums';
import type { SessionUser } from '@/types/domain';

/**
 * The one place permission is decided.
 * Every guarded control in the interface and every write path calls `can`.
 * Row Level Security enforces the same rules a second time at the database,
 * because the client is never trusted on its own.
 */

/** Every action the product gates. Adding a screen means adding an action here. */
export type Action =
  | 'project.create' | 'project.edit' | 'project.archive'
  | 'task.create' | 'task.update' | 'task.verify'
  | 'dpr.submit' | 'dpr.view'
  | 'worker.manage' | 'attendance.mark' | 'attendance.edit'
  | 'wage.view' | 'advance.record'
  | 'material.request' | 'material.approve' | 'stock.issue' | 'stock.receive'
  | 'po.create' | 'po.approve' | 'vendor.manage'
  | 'asset.manage' | 'asset.move' | 'asset.view'
  | 'issue.raise' | 'issue.assign' | 'issue.resolve' | 'issue.close'
  | 'expense.submit' | 'expense.approve'
  | 'document.upload' | 'document.viewOfficeOnly'
  | 'report.export'
  | 'company.manageUsers' | 'company.settings';

/**
 * Role to action map. A role may perform an action when it is listed, or when
 * the action carries a site-level condition that the user satisfies.
 */
const ROLE_ACTIONS: Record<Role, Action[]> = {
  owner: [
    'project.create', 'project.edit', 'project.archive',
    'task.create', 'task.update', 'task.verify', 'dpr.view',
    'worker.manage', 'attendance.edit', 'wage.view', 'advance.record',
    'material.approve', 'po.approve', 'vendor.manage',
    'asset.manage', 'asset.move', 'asset.view',
    'issue.assign', 'issue.resolve', 'issue.close',
    'expense.approve', 'document.upload', 'document.viewOfficeOnly',
    'report.export', 'company.manageUsers', 'company.settings',
  ],
  pm: [
    'project.create', 'project.edit',
    'task.create', 'task.update', 'task.verify', 'dpr.view',
    'worker.manage', 'attendance.mark', 'attendance.edit', 'wage.view', 'advance.record',
    'material.request', 'material.approve', 'stock.issue',
    'po.create', 'asset.manage', 'asset.move', 'asset.view',
    'issue.raise', 'issue.assign', 'issue.resolve', 'issue.close',
    'expense.submit', 'document.upload', 'document.viewOfficeOnly', 'report.export',
  ],
  site: [
    'task.update', 'dpr.submit', 'dpr.view',
    'attendance.mark', 'attendance.edit',
    'material.request', 'stock.issue', 'stock.receive',
    'asset.move', 'asset.view',
    'issue.raise', 'issue.resolve',
    'expense.submit', 'document.upload',
  ],
  procurement: [
    'dpr.view', 'material.approve', 'stock.issue', 'stock.receive',
    'po.create', 'vendor.manage',
    'asset.manage', 'asset.move', 'asset.view',
    'document.upload', 'report.export',
  ],
  accounts: [
    'dpr.view', 'wage.view', 'material.approve', 'po.approve',
    'expense.approve', 'asset.view', 'document.viewOfficeOnly', 'report.export',
  ],
};

/**
 * Actions only a site engineer may perform. A supervisor sees the same screens
 * but without these affordances. There is one site role, not two.
 */
const ENGINEER_ONLY: Action[] = ['task.verify', 'dpr.submit', 'material.request'];

/**
 * Decides whether a user may perform an action.
 * `resource` narrows the check to a project the user must be assigned to.
 */
export function can(
  user: Pick<SessionUser, 'role' | 'site_level'> | null,
  action: Action,
): boolean {
  if (!user) return false;

  if (user.role === 'site' && ENGINEER_ONLY.includes(action)) {
    return user.site_level === 'engineer';
  }

  return ROLE_ACTIONS[user.role]?.includes(action) ?? false;
}

/** Convenience guard for the several places that check a set of actions. */
export function canAny(
  user: Pick<SessionUser, 'role' | 'site_level'> | null,
  actions: Action[],
): boolean {
  return actions.some((action) => can(user, action));
}

/** Whether a role uses the mobile site shell rather than the office shell. */
export function usesSiteShell(role: Role): boolean {
  return role === 'site';
}

/** Human-readable label key for a role, resolved through the message files. */
export function roleLabelKey(role: Role, siteLevel?: SiteLevel | null): string {
  if (role === 'site' && siteLevel) return `roles.site_${siteLevel}`;
  return `roles.${role}`;
}
