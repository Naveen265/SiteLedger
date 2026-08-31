import {
  Building2, ClipboardList, FileText, HardHat, Package, Receipt, Truck,
  TriangleAlert, Users, Wrench, LayoutDashboard, FolderOpen, BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Role } from '@/types/enums';
import { routes } from './routes';

/**
 * Navigation is data, not markup.
 * The sidebar, the site tab bar and the mobile overflow menu all render from
 * these arrays, so adding a module means adding one entry, not editing three
 * components.
 */

export type NavItem = {
  /** Message key for the label. Nothing here is a hardcoded string. */
  labelKey: string;
  icon: LucideIcon;
  /** Built from the current project id, or a fixed path where none is needed. */
  to: (projectId: string) => string;
  /** Roles allowed to see the entry. Empty means every role. */
  roles?: Role[];
};

/** Entries above the project section in the office sidebar. */
export const COMPANY_NAV: NavItem[] = [
  { labelKey: 'nav.myCompany', icon: Building2, to: () => routes.company, roles: ['owner', 'accounts'] },
  { labelKey: 'nav.projects', icon: FolderOpen, to: () => routes.projects },
];

/** Entries scoped to the currently selected project. */
export const PROJECT_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: LayoutDashboard, to: routes.projectDashboard },
  { labelKey: 'nav.tasks', icon: ClipboardList, to: routes.tasks },
  { labelKey: 'nav.dpr', icon: FileText, to: routes.dpr },
  { labelKey: 'nav.labour', icon: Users, to: routes.labour },
  { labelKey: 'nav.materials', icon: Package, to: routes.materials },
  { labelKey: 'nav.procurement', icon: Truck, to: routes.procurement, roles: ['owner', 'pm', 'procurement', 'accounts'] },
  { labelKey: 'nav.equipment', icon: Wrench, to: routes.equipment },
  { labelKey: 'nav.issues', icon: TriangleAlert, to: routes.issues },
  { labelKey: 'nav.expenses', icon: Receipt, to: routes.expenses },
  { labelKey: 'nav.documents', icon: FolderOpen, to: routes.documents },
  { labelKey: 'nav.reports', icon: BarChart3, to: routes.reports, roles: ['owner', 'pm', 'accounts', 'procurement'] },
];

/** The site shell tab bar. At most five destinations, thumb reachable. */
export const SITE_NAV: NavItem[] = [
  { labelKey: 'nav.home', icon: HardHat, to: () => routes.site },
  { labelKey: 'nav.tasks', icon: ClipboardList, to: () => routes.siteTasks },
  { labelKey: 'labour.attendance', icon: Users, to: () => routes.siteAttendance },
  { labelKey: 'nav.issues', icon: TriangleAlert, to: () => routes.siteIssue },
  { labelKey: 'nav.profile', icon: Building2, to: () => routes.profile },
];

/** Filters a navigation list down to what a role may see. */
export function navItemsForRole(items: NavItem[], role: Role): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}
