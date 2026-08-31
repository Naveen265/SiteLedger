import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { StatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatDate } from '@/lib/format/date';
import { isTaskOverdue } from '@/lib/calc/tasks';
import { PRIORITIES, TASK_STATUSES } from '@/types/enums';
import type { Task } from '@/types/domain';
import { useTasks } from '../hooks/useTasks';
import { PriorityChip, TaskStatusChip } from '../components/TaskStatusChip';
import { TaskFormDialog } from '../components/TaskFormDialog';
import { TaskDetailDialog } from '../components/TaskDetailDialog';

/**
 * The task list.
 * Overdue is shown as a chip derived from the due date, never as a status,
 * so a task can correctly be both in progress and overdue.
 */
export function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useTasks(projectId ?? null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const tasks = data ?? [];

  const table = useTableState({
    rows: tasks,
    searchFields: [(task) => task.title],
    initialSortKey: 'due',
    comparators: {
      title: (a, b) => a.title.localeCompare(b.title),
      due: (a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
      progress: (a, b) => a.progress_pct - b.progress_pct,
    },
  });

  // Status, priority and the overdue toggle filter the searched set.
  const rows = useMemo(() => {
    const status = table.filters.status ?? 'all';
    const priority = table.filters.priority ?? 'all';
    const overdue = table.filters.overdue ?? 'all';
    return table.rows.filter(
      (task) =>
        (status === 'all' || task.status === status) &&
        (priority === 'all' || task.priority === priority) &&
        (overdue === 'all' || isTaskOverdue(task)),
    );
  }, [table.rows, table.filters]);

  const columns = useMemo<Column<Task>[]>(
    () => [
      {
        key: 'title', header: t('common.title'), sortable: true,
        render: (task) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{task.title}</span>
            {isTaskOverdue(task) && (
              <StatusChip label={t('tasks.overdue')} tone="delayed" size="sm" />
            )}
          </div>
        ),
      },
      { key: 'status', header: t('common.status'), render: (task) => <TaskStatusChip status={task.status} /> },
      {
        key: 'priority', header: t('common.priority'), hideOnMobile: true,
        render: (task) => <PriorityChip priority={task.priority} />,
      },
      {
        key: 'assignee', header: t('common.assignee'), hideOnMobile: true,
        render: (task) => task.assignee?.full_name ?? task.assignee_name_text ?? '-',
      },
      {
        key: 'due', header: t('common.dueDate'), sortable: true, align: 'right',
        render: (task) => (task.due_date ? formatDate(task.due_date) : '-'),
      },
      {
        key: 'progress', header: t('tasks.progress'), sortable: true, width: '140px',
        render: (task) => <Progress value={task.progress_pct} />,
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('tasks.title')}
        actions={
          can('task.create') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setIsCreateOpen(true)}>
              {t('tasks.create')}
            </Button>
          )
        }
      />

      <FilterBar
        search={table.search}
        onSearchChange={table.setSearch}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clearFilters}
      >
        <FilterSelect
          label={t('common.status')}
          value={table.filters.status ?? 'all'}
          onChange={(value) => table.setFilter('status', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...TASK_STATUSES.map((status) => ({ value: status, label: t(`tasks.status.${status}`) })),
          ]}
        />
        <FilterSelect
          label={t('common.priority')}
          value={table.filters.priority ?? 'all'}
          onChange={(value) => table.setFilter('priority', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...PRIORITIES.map((priority) => ({ value: priority, label: t(`status.${priority}`) })),
          ]}
        />
        <FilterSelect
          label={t('tasks.overdue')}
          value={table.filters.overdue ?? 'all'}
          onChange={(value) => table.setFilter('overdue', value)}
          options={[
            { value: 'all', label: t('common.all') },
            { value: 'overdue', label: t('tasks.overdue') },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(task) => task.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onRowClick={(task) => setOpenTaskId(task.id)}
        emptyMessage={t('tasks.empty')}
        emptyAction={
          can('task.create') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setIsCreateOpen(true)}>
              {t('tasks.create')}
            </Button>
          )
        }
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <TaskFormDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        projectId={projectId!}
      />
      <TaskDetailDialog
        taskId={openTaskId}
        projectId={projectId!}
        onClose={() => setOpenTaskId(null)}
      />

      {tasks.length === 0 && !isLoading && (
        <p className="sr-only">
          <ClipboardList aria-hidden /> {t('tasks.empty')}
        </p>
      )}
    </div>
  );
}
