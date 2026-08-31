import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, Truck, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { MetricTile } from '@/components/patterns/MetricTile';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisProps, chartTheme } from '@/components/charts/theme';
import { MetricGridSkeleton } from '@/components/skeletons';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/StatusChip';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { routes } from '@/config/routes';
import { formatCount, formatPercent } from '@/lib/format/number';
import {
  calculateCurrentIdleDays, calculateDprCompliance,
  calculateProjectHealth, calculateProjectProgressPct, countCriticalOpenIssues,
  findRentalsDueSoon, isIssueOpen,
} from '@/lib/calc';
import { usePortfolioTasks } from '@/modules/tasks/hooks/useTasks';
import { usePortfolioIssues } from '@/modules/issues/hooks/useIssues';
import { usePortfolioDprs } from '@/modules/dpr/hooks/useDpr';
import { useAssets } from '@/modules/equipment/hooks/useEquipment';
import { usePurchaseOrders } from '@/modules/procurement/hooks/useProcurement';
import { OnboardingChecklist } from '../components/OnboardingChecklist';

/**
 * The owner's portfolio view.
 * Read-mostly by design: this screen never lands on a capture form, because
 * an owner's job here is to see which projects are at risk and why.
 */
export function CompanyOverviewPage() {
  const t = useTranslate();
  const { projects, activeProjects, isLoading } = useProject();

  const projectIds = useMemo(() => projects.map((project) => project.id), [projects]);
  const tasksQuery = usePortfolioTasks(projectIds);
  const issuesQuery = usePortfolioIssues(projectIds);
  const dprsQuery = usePortfolioDprs(projectIds);
  const assetsQuery = useAssets();
  const purchaseOrdersQuery = usePurchaseOrders();

  // Progress and health per project, derived once for the whole screen.
  const projectSummaries = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const issues = issuesQuery.data ?? [];

    return activeProjects.map((project) => {
      const projectTasks = tasks.filter((task) => task.project_id === project.id);
      const progressPct = calculateProjectProgressPct(projectTasks);
      return {
        project,
        progressPct,
        health: calculateProjectHealth(progressPct, project.start_date, project.planned_end_date),
        openIssues: issues.filter((issue) => issue.project_id === project.id && isIssueOpen(issue)).length,
      };
    });
  }, [activeProjects, tasksQuery.data, issuesQuery.data]);

  const atRisk = projectSummaries.filter((summary) => summary.health !== 'on_track');

  // Equipment alerts: idle beyond threshold, and rentals due back.
  const equipmentAlerts = useMemo(() => {
    const assets = assetsQuery.data ?? [];
    const idle = assets.filter(
      (asset) => calculateCurrentIdleDays(asset, []) > asset.idle_threshold_days,
    );
    return { idle, rentalsDue: findRentalsDueSoon(assets) };
  }, [assetsQuery.data]);

  const pendingPos = (purchaseOrdersQuery.data ?? []).filter(
    (po) => po.status === 'pending_approval',
  );

  const compliance = useMemo(() => {
    const dprs = dprsQuery.data ?? [];
    return activeProjects.map((project) => {
      const submitted = dprs
        .filter((dpr) => dpr.project_id === project.id)
        .map((dpr) => dpr.report_date);
      const result = calculateDprCompliance(submitted, project.start_date, 14);
      return { name: project.name, pct: result.pct };
    });
  }, [activeProjects, dprsQuery.data]);

  const portfolioProgressData = projectSummaries.map((summary) => ({
    name: summary.project.name,
    progress: summary.progressPct,
  }));

  const portfolioProgressPct =
    projectSummaries.length === 0
      ? 0
      : Math.round(
          projectSummaries.reduce((sum, summary) => sum + summary.progressPct, 0) /
            projectSummaries.length,
        );

  if (isLoading) return <MetricGridSkeleton />;

  // A brand new company sees the setup checklist, not an empty dashboard.
  if (projects.length === 0) return <OnboardingChecklist />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('company.title')} description={t('company.subtitle')} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={t('company.activeProjects')}
          value={formatCount(activeProjects.length)}
        />
        <MetricTile
          label={t('company.portfolioProgress')}
          value={formatPercent(portfolioProgressPct)}
          explain="portfolioProgress"
        />
        <MetricTile
          label={t('company.projectsAtRisk')}
          value={formatCount(atRisk.length)}
          tone={atRisk.length > 0 ? 'risk' : 'default'}
        />
        <MetricTile
          label={t('company.openCritical')}
          value={formatCount(countCriticalOpenIssues(issuesQuery.data ?? []))}
          explain="openCritical"
          tone="delayed"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          chartId="portfolioProgress"
          isLoading={tasksQuery.isLoading}
          isEmpty={portfolioProgressData.length === 0}
          emptyMessage={t('projects.empty')}
        >
          <BarChart data={portfolioProgressData} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} />
            <YAxis type="category" dataKey="name" width={110} {...axisProps} />
            <Tooltip content={<ChartTooltip formatValue={(value) => `${value}%`} />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
            <Bar dataKey="progress" name={t('projects.progress')} fill={chartTheme.primary} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          chartId="dprCompliance"
          isLoading={dprsQuery.isLoading}
          isEmpty={compliance.length === 0}
          emptyMessage={t('dpr.empty')}
        >
          <BarChart data={compliance} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} unit="%" {...axisProps} />
            <YAxis type="category" dataKey="name" width={110} {...axisProps} />
            <Tooltip content={<ChartTooltip formatValue={(value) => `${value}%`} />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
            <Bar dataKey="pct" name={t('reports.dailyReports')} fill={chartTheme.ontrack} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={t('company.projectsAtRisk')} />
          {atRisk.length === 0 ? (
            <EmptyState icon={<Building2 className="size-5" />} message={t('company.emptyAlerts')} />
          ) : (
            <ul className="divide-y divide-border">
              {atRisk.map((summary) => (
                <li key={summary.project.id}>
                  <Link
                    to={routes.projectDashboard(summary.project.id)}
                    className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">{summary.project.name}</p>
                      <p className="text-2xs text-ink-muted">
                        {formatPercent(summary.progressPct)}
                        {summary.openIssues > 0 && ` · ${summary.openIssues} ${t('projects.openIssues').toLowerCase()}`}
                      </p>
                    </div>
                    <StatusChip
                      label={t(`status.${summary.health}`)}
                      tone={summary.health === 'delayed' ? 'delayed' : 'risk'}
                      size="sm"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={t('company.equipmentAlerts')} />
          {equipmentAlerts.idle.length === 0 && equipmentAlerts.rentalsDue.length === 0 ? (
            <EmptyState icon={<Wrench className="size-5" />} message={t('company.emptyAlerts')} />
          ) : (
            <ul className="divide-y divide-border">
              {equipmentAlerts.idle.map((asset) => (
                <li key={asset.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="truncate text-xs text-ink">{asset.name}</span>
                  <StatusChip label={t('equipment.idleAlert')} tone="risk" size="sm" />
                </li>
              ))}
              {equipmentAlerts.rentalsDue.map((asset) => (
                <li key={`rental-${asset.id}`} className="flex items-center justify-between gap-2 px-4 py-3">
                  <span className="truncate text-xs text-ink">{asset.name}</span>
                  <StatusChip label={t('equipment.rentalOverdue')} tone="delayed" size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={t('company.procurementAlerts')} />
          {pendingPos.length === 0 ? (
            <EmptyState icon={<Truck className="size-5" />} message={t('company.emptyAlerts')} />
          ) : (
            <ul className="divide-y divide-border">
              {pendingPos.map((po) => (
                <li key={po.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-ink">{po.vendor?.name}</p>
                    <p className="text-2xs text-ink-muted">{po.po_number}</p>
                  </div>
                  <StatusChip label={t('procurement.poStatus.pending_approval')} tone="risk" size="sm" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
