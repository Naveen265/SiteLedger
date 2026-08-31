import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, FileText } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { MetricTile } from '@/components/patterns/MetricTile';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisProps, chartTheme } from '@/components/charts/theme';
import { DashboardSkeleton } from '@/components/skeletons';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatPaise, formatPaiseCompact } from '@/lib/format/currency';
import { formatCount, formatPercent } from '@/lib/format/number';
import { formatDate } from '@/lib/format/date';
import { routes } from '@/config/routes';
import { EXPENSE_CATEGORIES, TASK_STATUSES } from '@/types/enums';
import { calculateMonthlySpend } from '@/lib/calc/spend';
import { useExpenses } from '@/modules/expenses/hooks/useExpenses';
import { useProjectDashboard } from '../hooks/useProjectDashboard';

/**
 * The project dashboard.
 * One screen with three role variants rather than three pages: an owner sees a
 * read-mostly summary, a project manager sees the same data plus the controls
 * to act on it, and a site user sees a cut-down view with capture buttons.
 */
export function ProjectDashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, can } = useAuth();
  const t = useTranslate();
  const dashboard = useProjectDashboard(projectId ?? null);
  const expensesQuery = useExpenses(projectId ? [projectId] : []);

  const isOwnerView = user?.role === 'owner';
  const canAct = can('task.create') || can('issue.assign');

  const taskStatusData = useMemo(
    () =>
      TASK_STATUSES.filter((status) => dashboard.taskStatusCounts[status] > 0).map((status) => ({
        status: t(`tasks.status.${status}`),
        count: dashboard.taskStatusCounts[status],
      })),
    [dashboard.taskStatusCounts, t],
  );

  const monthlySpend = useMemo(
    () => calculateMonthlySpend(expensesQuery.data ?? [], []),
    [expensesQuery.data],
  );

  if (dashboard.isLoading) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={dashboard.project?.name ?? t('dashboard.title')}
        description={dashboard.project?.client_name ?? undefined}
        actions={
          <StatusChip
            label={t(`status.${dashboard.health}`)}
            tone={dashboard.health === 'delayed' ? 'delayed' : dashboard.health === 'at_risk' ? 'risk' : 'ontrack'}
          />
        }
      />

      {/* The project manager is nudged when today's report is missing. */}
      {!dashboard.hasTodayDpr && canAct && (
        <Card className="border-status-risk/40 bg-[color-mix(in_srgb,var(--color-status-risk)_8%,white)]">
          <div className="flex flex-wrap items-center gap-3 p-3">
            <AlertTriangle className="size-4 shrink-0 text-status-risk" aria-hidden />
            <p className="flex-1 text-xs text-ink">{t('dashboard.missingDpr')}</p>
            <Link
              to={routes.dpr(projectId!)}
              className="inline-flex h-8 items-center rounded-[var(--radius-control)] border border-border bg-surface px-3 text-xs font-medium text-ink hover:bg-surface-subtle"
            >
              {t('dpr.title')}
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={t('projects.progress')}
          value={formatPercent(dashboard.progressPct)}
          explain="projectProgress"
          tone={dashboard.health === 'delayed' ? 'delayed' : 'default'}
        />
        <MetricTile
          label={t('dashboard.overdueTasks')}
          value={formatCount(dashboard.overdueTaskCount)}
          explain="taskStatus"
          tone={dashboard.overdueTaskCount > 0 ? 'risk' : 'default'}
        />
        <MetricTile
          label={t('dashboard.labourToday')}
          value={formatCount(dashboard.headcountToday)}
          explain="labourHeadcount"
        />
        <MetricTile
          label={t('dashboard.spendToDate')}
          value={formatPaise(dashboard.spendPaise)}
          sublabel={
            dashboard.budgetUsagePct !== null
              ? `${formatPercent(dashboard.budgetUsagePct)} ${t('dashboard.budgetUsed').toLowerCase()}`
              : undefined
          }
          explain="spendToDate"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          chartId="progressOverTime"
          isEmpty={dashboard.progressSeries.length === 0}
          emptyMessage={t('dashboard.empty')}
        >
          <LineChart data={dashboard.progressSeries.map((point) => ({ ...point, label: formatDate(point.date) }))}>
            <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} vertical={false} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} {...axisProps} width={36} unit="%" />
            <Tooltip content={<ChartTooltip formatValue={(value) => `${value}%`} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="planned" name={t('reports.progress')} stroke={chartTheme.idle} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="actual" name={t('projects.progress')} stroke={chartTheme.primary} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ChartCard>

        <ChartCard chartId="taskStatus" isEmpty={taskStatusData.length === 0} emptyMessage={t('tasks.empty')}>
          <BarChart data={taskStatusData} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} horizontal={false} />
            <XAxis type="number" allowDecimals={false} {...axisProps} />
            <YAxis type="category" dataKey="status" width={92} {...axisProps} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
            <Bar dataKey="count" name={t('nav.tasks')} fill={chartTheme.primary} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard chartId="spendByCategory" isEmpty={monthlySpend.length === 0} emptyMessage={t('expenses.empty')}>
          <BarChart data={monthlySpend}>
            <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis tickFormatter={formatPaiseCompact} {...axisProps} width={52} />
            <Tooltip content={<ChartTooltip formatValue={(value) => formatPaise(value)} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {EXPENSE_CATEGORIES.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="spend"
                name={t(`expenses.category.${category}`)}
                fill={[chartTheme.primary, chartTheme.ontrack, chartTheme.risk, chartTheme.idle, chartTheme.delayed][index]}
              />
            ))}
          </BarChart>
        </ChartCard>

        <Card>
          <CardHeader title={t('dashboard.latestDpr')} />
          {dashboard.dprs.length === 0 ? (
            <EmptyState icon={<FileText className="size-6" />} message={t('dpr.empty')} />
          ) : (
            <ul className="divide-y divide-border">
              {dashboard.dprs.slice(0, 5).map((dpr) => (
                <li key={dpr.id}>
                  <Link
                    to={routes.dprDetail(projectId!, dpr.id)}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink">{formatDate(dpr.report_date)}</p>
                      <p className="truncate text-2xs text-ink-muted">
                        {dpr.submitter?.full_name ?? ''}
                      </p>
                    </div>
                    {dpr.dpr_timing_seconds !== null && (
                      <span className="tabular shrink-0 text-2xs text-ink-faint">
                        {dpr.dpr_timing_seconds}s
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* An owner lands on a read-mostly view: no capture buttons anywhere. */}
      {!isOwnerView && (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile
            label={t('materials.lowStock')}
            value={formatCount(dashboard.lowStockCount)}
            explain="stockOnHand"
            tone={dashboard.lowStockCount > 0 ? 'risk' : 'default'}
          />
          <MetricTile
            label={t('dashboard.equipmentOnSite')}
            value={formatCount(dashboard.assets.length)}
            explain="idleDays"
          />
          <MetricTile
            label={t('company.openCritical')}
            value={formatCount(dashboard.criticalIssueCount)}
            explain="openCritical"
            tone={dashboard.criticalIssueCount > 0 ? 'delayed' : 'default'}
          />
        </div>
      )}
    </div>
  );
}
