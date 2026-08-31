import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { PageHeader } from '@/components/patterns/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatDate } from '@/lib/format/date';
import { isTaskOverdue } from '@/lib/calc/tasks';
import { StatusChip } from '@/components/ui/StatusChip';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { TaskDetailDialog } from '@/modules/tasks/components/TaskDetailDialog';
import { TaskStatusChip } from '@/modules/tasks/components/TaskStatusChip';

/** The site user's task list, scoped to what they are actually assigned. */
export function SiteTasksPage() {
  const t = useTranslate();
  const { user } = useAuth();
  const { currentProjectId } = useProject();
  const { data, isLoading } = useTasks(currentProjectId);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const myTasks = useMemo(
    () =>
      (data ?? []).filter(
        (task) =>
          task.status !== 'cancelled' &&
          (task.assignee_profile_id === user?.id || task.assignee_profile_id === null),
      ),
    [data, user],
  );

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={t('site.todayTasks')} />

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : myTasks.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardList className="size-6" />} message={t('dpr.noTasks')} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {myTasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => setOpenTaskId(task.id)}
                className="w-full rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs font-medium text-ink">{task.title}</p>
                  <TaskStatusChip status={task.status} />
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {task.due_date && (
                    <span className="text-2xs text-ink-muted">{formatDate(task.due_date)}</span>
                  )}
                  {isTaskOverdue(task) && (
                    <StatusChip label={t('tasks.overdue')} tone="delayed" size="sm" />
                  )}
                </div>
                <Progress value={task.progress_pct} className="mt-2" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {currentProjectId && (
        <TaskDetailDialog
          taskId={openTaskId}
          projectId={currentProjectId}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
