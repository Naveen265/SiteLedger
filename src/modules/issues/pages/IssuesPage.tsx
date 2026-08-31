import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Camera, TriangleAlert } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisProps, chartTheme } from '@/components/charts/theme';
import { Button } from '@/components/ui/Button';
import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatRelative } from '@/lib/format/date';
import { calculateIssueAgeing, isIssueEscalated } from '@/lib/calc/issues';
import { ISSUE_STATUSES, PRIORITIES } from '@/types/enums';
import type { Issue } from '@/types/domain';
import { useIssues } from '../hooks/useIssues';
import { ReportIssueDialog } from '../components/ReportIssueDialog';
import { IssueDetailDialog } from '../components/IssueDetailDialog';

/** Maps an issue status to its chip tone. */
const STATUS_TONE: Record<string, StatusTone> = {
  open: 'delayed',
  assigned: 'risk',
  in_progress: 'info',
  resolved: 'ontrack',
  closed: 'neutral',
};

/** The issue list, with ageing and escalation both derived, never stored. */
export function IssuesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useIssues(projectId ?? null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  const issues = data ?? [];
  const ageing = useMemo(() => calculateIssueAgeing(issues), [issues]);

  const table = useTableState({
    rows: issues,
    searchFields: [(issue) => issue.title, (issue) => issue.area],
    initialSortKey: 'created',
    initialSortDirection: 'desc',
    comparators: {
      created: (a, b) => a.created_at.localeCompare(b.created_at),
      priority: (a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority),
    },
  });

  const rows = useMemo(() => {
    const status = table.filters.status ?? 'all';
    const priority = table.filters.priority ?? 'all';
    return table.rows.filter(
      (issue) =>
        (status === 'all' || issue.status === status) &&
        (priority === 'all' || issue.priority === priority),
    );
  }, [table.rows, table.filters]);

  const columns = useMemo<Column<Issue>[]>(
    () => [
      {
        key: 'title', header: t('common.title'),
        render: (issue) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">{issue.title}</span>
            {isIssueEscalated(issue) && (
              <StatusChip label={t('issues.escalated')} tone="delayed" size="sm" />
            )}
          </div>
        ),
      },
      { key: 'area', header: t('issues.area'), hideOnMobile: true, render: (issue) => issue.area ?? '-' },
      {
        key: 'priority', header: t('common.priority'), sortable: true,
        render: (issue) => (
          <StatusChip
            label={t(`status.${issue.priority}`)}
            tone={issue.priority === 'critical' ? 'delayed' : issue.priority === 'high' ? 'risk' : 'neutral'}
            size="sm"
          />
        ),
      },
      {
        key: 'status', header: t('common.status'),
        render: (issue) => (
          <StatusChip label={t(`issues.status.${issue.status}`)} tone={STATUS_TONE[issue.status]} size="sm" />
        ),
      },
      {
        key: 'assignee', header: t('common.assignee'), hideOnMobile: true,
        render: (issue) => issue.assignee?.full_name ?? '-',
      },
      {
        key: 'created', header: t('issues.ageing'), align: 'right', sortable: true, explain: 'issueAgeing',
        render: (issue) => formatRelative(issue.created_at),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('issues.title')}
        actions={
          can('issue.raise') && (
            <Button icon={<Camera className="size-4" />} onClick={() => setIsReportOpen(true)}>
              {t('issues.report')}
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
            ...ISSUE_STATUSES.map((status) => ({ value: status, label: t(`issues.status.${status}`) })),
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
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(issue) => issue.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onRowClick={(issue) => setOpenIssueId(issue.id)}
        emptyMessage={t('issues.empty')}
        emptyAction={
          can('issue.raise') && (
            <Button icon={<TriangleAlert className="size-4" />} onClick={() => setIsReportOpen(true)}>
              {t('issues.report')}
            </Button>
          )
        }
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <ChartCard
        chartId="issueAgeing"
        isLoading={isLoading}
        isEmpty={ageing.every((bucket) => bucket.count === 0)}
        emptyMessage={t('issues.empty')}
      >
        <BarChart data={ageing}>
          <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} vertical={false} />
          <XAxis dataKey="bucket" {...axisProps} unit=" d" />
          <YAxis allowDecimals={false} {...axisProps} width={32} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
          <Bar dataKey="count" name={t('issues.title')} fill={chartTheme.risk} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartCard>

      <ReportIssueDialog open={isReportOpen} onClose={() => setIsReportOpen(false)} projectId={projectId!} />
      <IssueDetailDialog
        issueId={openIssueId}
        projectId={projectId!}
        onClose={() => setOpenIssueId(null)}
      />
    </div>
  );
}
