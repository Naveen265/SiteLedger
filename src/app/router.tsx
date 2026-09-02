import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { routes } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { OfficeShell } from '@/components/layout/OfficeShell';
import { SiteShell } from '@/components/layout/SiteShell';
import { RedirectIfAuthenticated, RequireAuth, homePathForRole } from './guards';
import { DashboardSkeleton } from '@/components/skeletons';

import { SignInPage } from '@/modules/auth/pages/SignInPage';
import { SignUpPage } from '@/modules/auth/pages/SignUpPage';
import { ForgotPasswordPage } from '@/modules/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/modules/auth/pages/ResetPasswordPage';
import { NoCompanyPage } from '@/modules/auth/pages/NoCompanyPage';

// Office screens are loaded on demand. This is what keeps the charting library
// off the critical path for a site engineer on a 3G connection, who never
// opens any of these screens.
const CompanyOverviewPage = lazy(() => import('@/modules/company/pages/CompanyOverviewPage').then((m) => ({ default: m.CompanyOverviewPage })));
const CompanyUsersPage = lazy(() => import('@/modules/company/pages/CompanyUsersPage').then((m) => ({ default: m.CompanyUsersPage })));
const ProfilePage = lazy(() => import('@/modules/company/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ProjectsListPage = lazy(() => import('@/modules/projects/pages/ProjectsListPage').then((m) => ({ default: m.ProjectsListPage })));
const ProjectDashboardPage = lazy(() => import('@/modules/dashboard/pages/ProjectDashboardPage').then((m) => ({ default: m.ProjectDashboardPage })));
const TasksPage = lazy(() => import('@/modules/tasks/pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const DprListPage = lazy(() => import('@/modules/dpr/pages/DprListPage').then((m) => ({ default: m.DprListPage })));
const LabourPage = lazy(() => import('@/modules/labour/pages/LabourPage').then((m) => ({ default: m.LabourPage })));
const MaterialsPage = lazy(() => import('@/modules/materials/pages/MaterialsPage').then((m) => ({ default: m.MaterialsPage })));
const ProcurementPage = lazy(() => import('@/modules/procurement/pages/ProcurementPage').then((m) => ({ default: m.ProcurementPage })));
const EquipmentPage = lazy(() => import('@/modules/equipment/pages/EquipmentPage').then((m) => ({ default: m.EquipmentPage })));
const IssuesPage = lazy(() => import('@/modules/issues/pages/IssuesPage').then((m) => ({ default: m.IssuesPage })));
const ExpensesPage = lazy(() => import('@/modules/expenses/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const DocumentsPage = lazy(() => import('@/modules/documents/pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const ReportsPage = lazy(() => import('@/modules/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const NotificationsPage = lazy(() => import('@/modules/notifications/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));

import { SiteHomePage } from '@/modules/site/pages/SiteHomePage';
import { SiteAttendancePage } from '@/modules/site/pages/SiteAttendancePage';
import { SiteTasksPage } from '@/modules/site/pages/SiteTasksPage';
import { SiteIssuesPage } from '@/modules/site/pages/SiteIssuesPage';

/**
 * Redirects a bare project route to that project's dashboard, and keeps the
 * project switcher in step with the project id in the address bar.
 */
function ProjectIndexRedirect() {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={routes.projectDashboard(projectId!)} replace />;
}

/** Sends the root path to whichever home screen fits the signed-in role. */
function RootRedirect() {
  const { user, isReady } = useAuth();
  if (!isReady) return null;
  if (!user) return <Navigate to={routes.signIn} replace />;
  return <Navigate to={homePathForRole(user.role)} replace />;
}

/**
 * Sends a site user to their assigned project when they open a bare site path
 * with no project selected yet.
 */
function SiteGate() {
  const { currentProjectId, isLoading, projects } = useProject();
  if (isLoading) return null;
  if (!currentProjectId && projects.length === 0) return <NoCompanyPage />;
  return <SiteShell />;
}

/** The complete route table. */
export function AppRouter() {
  return (
    <Routes>
      {/* Unauthenticated */}
      <Route path={routes.signIn} element={<RedirectIfAuthenticated><SignInPage /></RedirectIfAuthenticated>} />
      <Route path={routes.signUp} element={<RedirectIfAuthenticated><SignUpPage /></RedirectIfAuthenticated>} />
      <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
      <Route path={routes.resetPassword} element={<ResetPasswordPage />} />

      {/* Office shell */}
      <Route
        element={
          <RequireAuth>
            {/* A shaped skeleton, not a spinner, so the layout does not jump. */}
            <Suspense fallback={<div className="p-6"><DashboardSkeleton /></div>}>
              <OfficeShell />
            </Suspense>
          </RequireAuth>
        }
      >
        <Route path={routes.company} element={<CompanyOverviewPage />} />
        <Route path={routes.companyUsers} element={<CompanyUsersPage />} />
        <Route path={routes.projects} element={<ProjectsListPage />} />
        <Route path="/projects/:projectId" element={<ProjectIndexRedirect />} />
        <Route path="/projects/:projectId/dashboard" element={<ProjectDashboardPage />} />
        <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
        <Route path="/projects/:projectId/dpr" element={<DprListPage />} />
        <Route path="/projects/:projectId/labour" element={<LabourPage />} />
        <Route path="/projects/:projectId/materials" element={<MaterialsPage />} />
        <Route path="/projects/:projectId/procurement" element={<ProcurementPage />} />
        <Route path="/projects/:projectId/equipment" element={<EquipmentPage />} />
        <Route path="/projects/:projectId/issues" element={<IssuesPage />} />
        <Route path="/projects/:projectId/expenses" element={<ExpensesPage />} />
        <Route path="/projects/:projectId/documents" element={<DocumentsPage />} />
        <Route path="/projects/:projectId/reports" element={<ReportsPage />} />
        <Route path={routes.notifications} element={<NotificationsPage />} />
        <Route path={routes.profile} element={<ProfilePage />} />
      </Route>

      {/* Site shell */}
      <Route element={<RequireAuth><SiteGate /></RequireAuth>}>
        <Route path={routes.site} element={<SiteHomePage />} />
        <Route path={routes.siteAttendance} element={<SiteAttendancePage />} />
        <Route path={routes.siteTasks} element={<SiteTasksPage />} />
        <Route path={routes.siteIssue} element={<SiteIssuesPage />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
