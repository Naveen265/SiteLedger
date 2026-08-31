import { useMemo } from 'react';
import { subDays } from 'date-fns';
import { Dialog } from '@/components/ui/Dialog';
import { useTranslate } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { todayIso, toIsoDate } from '@/lib/format/date';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useAttendance } from '@/modules/labour/hooks/useLabour';
import { useStockMovements } from '@/modules/materials/hooks/useMaterials';
import { useAssets } from '@/modules/equipment/hooks/useEquipment';
import { DprForm } from './DprForm';
import { useSubmitDpr, useTodaysDpr } from '../hooks/useDpr';

/**
 * The submit report dialog.
 * Everything shown inside is pre-pulled from data already in the system: the
 * user's assigned tasks, today's attendance, today's material issues and the
 * equipment currently at this site.
 */
export function SubmitDprDialog({
  open, onClose, projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const t = useTranslate();
  const { user } = useAuth();
  const today = todayIso();

  const tasksQuery = useTasks(projectId);
  const attendanceQuery = useAttendance(projectId, today, today);
  const movementsQuery = useStockMovements(projectId);
  const assetsQuery = useAssets();
  const todaysDprQuery = useTodaysDpr(projectId);
  const submit = useSubmitDpr(projectId);

  // Only the tasks assigned to this user, and only the ones still open.
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

  // Only the issues that happened today, so the block reflects today's work.
  const todaysIssues = useMemo(
    () =>
      (movementsQuery.data ?? []).filter(
        (movement) =>
          movement.movement_type === 'issue' &&
          movement.moved_at.slice(0, 10) >= toIsoDate(subDays(new Date(), 0)),
      ),
    [movementsQuery.data],
  );

  const siteAssets = useMemo(
    () => (assetsQuery.data ?? []).filter((asset) => asset.current_project_id === projectId),
    [assetsQuery.data, projectId],
  );

  /** Submits the report and closes the dialog. */
  const onSubmit = async (
    values: Parameters<typeof submit.mutateAsync>[0]['values'],
    photoPaths: string[],
    timingSeconds: number,
  ) => {
    await submit.mutateAsync({ values, photoPaths, timingSeconds });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('dpr.submitTitle')}
      description={todaysDprQuery.data ? t('dpr.alreadySubmitted') : undefined}
      size="lg"
    >
      <DprForm
        tasks={myTasks}
        attendance={attendanceQuery.data ?? []}
        stockIssues={todaysIssues}
        assets={siteAssets}
        isLoading={tasksQuery.isLoading || attendanceQuery.isLoading}
        isSubmitting={submit.isPending}
        onSubmit={onSubmit}
      />
    </Dialog>
  );
}
