import { useMemo } from 'react';
import { subDays } from 'date-fns';
import { toIsoDate, todayIso } from '@/lib/format/date';
import {
  buildProgressSeries, calculateHeadcount, calculateProjectHealth,
  calculateProjectProgressPct, calculateSpendBreakdown, calculateStockOnHand,
  calculateTaskStatusCounts, calculateWageSummary, calculateLabourCostPaise,
  countCriticalOpenIssues, countOverdueTasks, isIssueOpen, totalSpendPaise,
  calculateBudgetUsagePct,
} from '@/lib/calc';
import { useProject } from '@/contexts/ProjectContext';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useIssues } from '@/modules/issues/hooks/useIssues';
import { useAttendance, useAdvances, useWorkers } from '@/modules/labour/hooks/useLabour';
import { useMaterialItems, useStockMovements } from '@/modules/materials/hooks/useMaterials';
import { useGoodsReceipts, usePurchaseOrders } from '@/modules/procurement/hooks/useProcurement';
import { useAssetCosts, useAssets } from '@/modules/equipment/hooks/useEquipment';
import { useExpenses } from '@/modules/expenses/hooks/useExpenses';
import { useDprs } from '@/modules/dpr/hooks/useDpr';

/**
 * Everything the project dashboard shows, derived in one place.
 * The three role variants render the same numbers with different affordances,
 * so the data is assembled once here rather than three times in three screens.
 */
export function useProjectDashboard(projectId: string | null) {
  const { projects } = useProject();
  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  const from = toIsoDate(subDays(new Date(), 30));
  const to = todayIso();

  const tasksQuery = useTasks(projectId);
  const issuesQuery = useIssues(projectId);
  const workersQuery = useWorkers();
  const attendanceQuery = useAttendance(projectId, from, to);
  const todayAttendanceQuery = useAttendance(projectId, to, to);
  const advancesQuery = useAdvances(from, to);
  const movementsQuery = useStockMovements(projectId);
  const materialItemsQuery = useMaterialItems();
  const purchaseOrdersQuery = usePurchaseOrders();
  const goodsReceiptsQuery = useGoodsReceipts(projectId);
  const assetsQuery = useAssets();
  const assetCostsQuery = useAssetCosts();
  const expensesQuery = useExpenses(projectId ? [projectId] : []);
  const dprsQuery = useDprs(projectId);

  return useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    const issues = issuesQuery.data ?? [];
    const attendance = attendanceQuery.data ?? [];
    const movements = movementsQuery.data ?? [];
    const assets = (assetsQuery.data ?? []).filter((asset) => asset.current_project_id === projectId);
    const purchaseOrders = (purchaseOrdersQuery.data ?? []).filter((po) => po.project_id === projectId);
    const assetCosts = (assetCostsQuery.data ?? []).filter((cost) => cost.project_id === projectId);
    const expenses = expensesQuery.data ?? [];
    const dprs = dprsQuery.data ?? [];

    const progressPct = calculateProjectProgressPct(tasks);

    // Labour cost feeds project spend, so it is calculated from the same wage
    // lines the wage summary screen shows, never from a second formula.
    const wageLines = calculateWageSummary(
      workersQuery.data ?? [],
      attendance,
      advancesQuery.data ?? [],
    );
    const labourCostPaise = calculateLabourCostPaise(wageLines);

    const spendBreakdown = calculateSpendBreakdown({
      expenses,
      purchaseOrders,
      goodsReceipts: goodsReceiptsQuery.data ?? [],
      assetCosts,
      labourPayablePaise: labourCostPaise,
    });
    const spendPaise = totalSpendPaise(spendBreakdown);

    const stock = calculateStockOnHand(movements, materialItemsQuery.data ?? []);

    // Actual progress by day comes from the reports already submitted.
    const actualByDate = new Map(
      dprs.map((dpr) => [dpr.report_date, progressPct]),
    );

    return {
      project,
      isLoading:
        tasksQuery.isLoading || issuesQuery.isLoading || attendanceQuery.isLoading,
      isError: tasksQuery.isError || issuesQuery.isError,
      refetch: () => {
        void tasksQuery.refetch();
        void issuesQuery.refetch();
      },

      progressPct,
      health: calculateProjectHealth(progressPct, project?.start_date ?? null, project?.planned_end_date ?? null),
      progressSeries: buildProgressSeries(
        project?.start_date ?? null,
        project?.planned_end_date ?? null,
        actualByDate,
      ),

      tasks,
      taskStatusCounts: calculateTaskStatusCounts(tasks),
      overdueTaskCount: countOverdueTasks(tasks),

      issues,
      openIssueCount: issues.filter(isIssueOpen).length,
      criticalIssueCount: countCriticalOpenIssues(issues),

      headcountToday: calculateHeadcount(todayAttendanceQuery.data ?? []),
      attendance,
      wageLines,

      stock,
      lowStockCount: stock.filter((line) => line.is_low).length,

      assets,
      purchaseOrders,
      openPoCount: purchaseOrders.filter(
        (po) => po.status === 'approved' || po.status === 'partially_received',
      ).length,

      spendBreakdown,
      spendPaise,
      budgetUsagePct: calculateBudgetUsagePct(spendPaise, project?.budget_paise ?? null),

      dprs,
      hasTodayDpr: dprs.some((dpr) => dpr.report_date === to),
    };
  }, [
    project, projectId, to,
    tasksQuery.data, tasksQuery.isLoading, tasksQuery.isError, tasksQuery.refetch,
    issuesQuery.data, issuesQuery.isLoading, issuesQuery.isError, issuesQuery.refetch,
    attendanceQuery.data, attendanceQuery.isLoading, todayAttendanceQuery.data,
    workersQuery.data, advancesQuery.data, movementsQuery.data, materialItemsQuery.data,
    purchaseOrdersQuery.data, goodsReceiptsQuery.data, assetsQuery.data, assetCostsQuery.data,
    expensesQuery.data, dprsQuery.data,
  ]);
}
