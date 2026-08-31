import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ErrorState } from '@/components/patterns/ErrorState';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { CardGridSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { routes } from '@/config/routes';
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/types/enums';
import { calculateProjectHealth, calculateProjectProgressPct, isIssueOpen } from '@/lib/calc';
import { usePortfolioTasks } from '@/modules/tasks/hooks/useTasks';
import { usePortfolioIssues } from '@/modules/issues/hooks/useIssues';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectFormDialog } from '../components/ProjectFormDialog';

/**
 * The projects list.
 * Every card shows derived progress and health rather than a stored field, so
 * the list is never stale relative to the tasks underneath it.
 */
export function ProjectsListPage() {
  const t = useTranslate();
  const { can } = useAuth();
  const navigate = useNavigate();
  const { projects, isLoading, isError, refetch } = useProject();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const tasksQuery = usePortfolioTasks(projectIds);
  const issuesQuery = usePortfolioIssues(projectIds);

  // Progress, health and open issue counts are derived once, here, and passed
  // down. No card computes anything for itself.
  const summaries = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const issues = issuesQuery.data ?? [];

    return new Map(
      projects.map((project) => {
        const projectTasks = tasks.filter((task) => task.project_id === project.id);
        const progressPct = calculateProjectProgressPct(projectTasks);
        return [
          project.id,
          {
            progressPct,
            health: calculateProjectHealth(progressPct, project.start_date, project.planned_end_date),
            openIssueCount: issues.filter(
              (issue) => issue.project_id === project.id && isIssueOpen(issue),
            ).length,
          },
        ];
      }),
    );
  }, [projects, tasksQuery.data, issuesQuery.data]);

  const table = useTableState({
    rows: projects,
    searchFields: [(project) => project.name, (project) => project.code],
    pageSize: 60,
  });

  // The status and type dropdowns filter the already searched set.
  const visible = useMemo(() => {
    const status = table.filters.status ?? 'all';
    const type = table.filters.type ?? 'all';
    return table.allFilteredRows.filter(
      (project) =>
        (status === 'all' || project.status === status) &&
        (type === 'all' || project.type === type),
    );
  }, [table.allFilteredRows, table.filters]);

  const canCreate = can('project.create');

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('projects.title')}
        actions={
          canCreate && (
            <Button icon={<Plus className="size-4" />} onClick={() => setIsCreateOpen(true)}>
              {t('projects.create')}
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
            ...PROJECT_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) })),
          ]}
        />
        <FilterSelect
          label={t('projects.type')}
          value={table.filters.type ?? 'all'}
          onChange={(value) => table.setFilter('type', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...PROJECT_TYPES.map((type) => ({ value: type, label: type })),
          ]}
        />
      </FilterBar>

      {isLoading ? (
        <CardGridSkeleton />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderOpen className="size-6" />}
            message={canCreate ? t('projects.empty') : t('projects.emptyForSite')}
            action={
              canCreate && (
                <Button icon={<Plus className="size-4" />} onClick={() => setIsCreateOpen(true)}>
                  {t('projects.create')}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => {
            const summary = summaries.get(project.id);
            return (
              <ProjectCard
                key={project.id}
                project={project}
                progressPct={summary?.progressPct ?? 0}
                health={summary?.health ?? 'on_track'}
                openIssueCount={summary?.openIssueCount ?? 0}
              />
            );
          })}
        </div>
      )}

      <ProjectFormDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSaved={(project) => navigate(routes.projectDashboard(project.id))}
      />
    </div>
  );
}
