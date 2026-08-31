import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ClipboardList, FileText, Package, Users, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Card, CardHeader } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { StatusChip } from '@/components/ui/StatusChip';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { todayIso } from '@/lib/format/date';
import { routes } from '@/config/routes';
import { calculateHeadcount } from '@/lib/calc/labour';
import { isIssueOpen } from '@/lib/calc/issues';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useAttendance } from '@/modules/labour/hooks/useLabour';
import { useIssues } from '@/modules/issues/hooks/useIssues';
import { useAssets } from '@/modules/equipment/hooks/useEquipment';
import { SubmitDprDialog } from '@/modules/dpr/components/SubmitDprDialog';
import { ReportIssueDialog } from '@/modules/issues/components/ReportIssueDialog';
import { MaterialRequestDialog } from '@/modules/materials/components/MaterialRequestDialog';

/**
 * One large capture button on the site launchpad.
 * Declared at module scope so it is a stable component: defining it inside the
 * page would remount every button on every render and lose focus.
 */
function ActionButton({
  icon, label, onClick, isPrimary,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isPrimary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)]',
        'border px-3 py-4 text-center transition-colors duration-150',
        isPrimary
          ? 'col-span-2 border-transparent bg-primary text-white hover:bg-primary-hover'
          : 'border-border bg-surface text-ink hover:bg-surface-subtle',
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

/**
 * The site home screen.
 * Large thumb-reachable buttons, the most common action one tap away, and the
 * current state of the site directly underneath so nothing has to be looked up.
 */
export function SiteHomePage() {
  const t = useTranslate();
  const { user, can } = useAuth();
  const { currentProjectId } = useProject();
  const navigate = useNavigate();
  const today = todayIso();

  const [openDialog, setOpenDialog] = useState<'dpr' | 'issue' | 'material' | null>(null);

  const tasksQuery = useTasks(currentProjectId);
  const attendanceQuery = useAttendance(currentProjectId, today, today);
  const issuesQuery = useIssues(currentProjectId);
  const assetsQuery = useAssets();

  const myTasks = useMemo(
    () =>
      (tasksQuery.data ?? []).filter(
        (task) =>
          task.status !== 'verified' &&
          task.status !== 'cancelled' &&
          (task.assignee_profile_id === user?.id || task.assignee_profile_id === null),
      ),
    [tasksQuery.data, user],
  );

  const myOpenIssues = useMemo(
    () => (issuesQuery.data ?? []).filter(isIssueOpen),
    [issuesQuery.data],
  );

  const siteAssets = useMemo(
    () => (assetsQuery.data ?? []).filter((asset) => asset.current_project_id === currentProjectId),
    [assetsQuery.data, currentProjectId],
  );

  const headcount = calculateHeadcount(attendanceQuery.data ?? []);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {can('dpr.submit') && (
          <ActionButton
            isPrimary
            icon={<FileText className="size-6" aria-hidden />}
            label={t('site.submitDpr')}
            onClick={() => setOpenDialog('dpr')}
          />
        )}
        {can('attendance.mark') && (
          <ActionButton
            icon={<Users className="size-5" aria-hidden />}
            label={t('site.markAttendance')}
            onClick={() => navigate(routes.siteAttendance)}
          />
        )}
        {can('issue.raise') && (
          <ActionButton
            icon={<Camera className="size-5" aria-hidden />}
            label={t('site.reportIssue')}
            onClick={() => setOpenDialog('issue')}
          />
        )}
        {can('material.request') && (
          <ActionButton
            icon={<Package className="size-5" aria-hidden />}
            label={t('site.materialRequest')}
            onClick={() => setOpenDialog('material')}
          />
        )}
        <ActionButton
          icon={<ClipboardList className="size-5" aria-hidden />}
          label={t('site.todayTasks')}
          onClick={() => navigate(routes.siteTasks)}
        />
      </div>

      <Card>
        <CardHeader
          title={t('labour.attendance')}
          actions={
            <span className="tabular text-xs font-semibold text-ink">
              {headcount} {t('labour.present').toLowerCase()}
            </span>
          }
        />
      </Card>

      <Card>
        <CardHeader title={t('site.todayTasks')} actions={<span className="tabular text-2xs text-ink-muted">{myTasks.length}</span>} />
        {tasksQuery.isLoading ? (
          <ListSkeleton rows={3} className="p-3" />
        ) : myTasks.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-5" />} message={t('dpr.noTasks')} />
        ) : (
          <ul className="divide-y divide-border">
            {myTasks.slice(0, 5).map((task) => (
              <li key={task.id} className="px-4 py-3">
                <p className="text-xs font-medium text-ink">{task.title}</p>
                <Progress value={task.progress_pct} className="mt-1.5" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t('issues.title')} actions={<span className="tabular text-2xs text-ink-muted">{myOpenIssues.length}</span>} />
        {myOpenIssues.length === 0 ? (
          <EmptyState message={t('issues.empty')} />
        ) : (
          <ul className="divide-y divide-border">
            {myOpenIssues.slice(0, 4).map((issue) => (
              <li key={issue.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-xs text-ink">{issue.title}</span>
                <StatusChip
                  label={t(`status.${issue.priority}`)}
                  tone={issue.priority === 'critical' ? 'delayed' : issue.priority === 'high' ? 'risk' : 'neutral'}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title={t('dashboard.equipmentOnSite')} />
        {siteAssets.length === 0 ? (
          <EmptyState icon={<Wrench className="size-5" />} message={t('equipment.empty')} />
        ) : (
          <ul className="flex flex-wrap gap-2 p-4">
            {siteAssets.map((asset) => (
              <li
                key={asset.id}
                className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2 py-1 text-2xs text-ink"
              >
                <Wrench className="size-3 text-ink-faint" aria-hidden />
                {asset.name}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {currentProjectId && (
        <>
          <SubmitDprDialog
            open={openDialog === 'dpr'}
            onClose={() => setOpenDialog(null)}
            projectId={currentProjectId}
          />
          <ReportIssueDialog
            open={openDialog === 'issue'}
            onClose={() => setOpenDialog(null)}
            projectId={currentProjectId}
          />
          <MaterialRequestDialog
            open={openDialog === 'material'}
            onClose={() => setOpenDialog(null)}
            projectId={currentProjectId}
          />
        </>
      )}
    </div>
  );
}
