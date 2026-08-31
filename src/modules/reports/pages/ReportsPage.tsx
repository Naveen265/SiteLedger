import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Explain } from '@/components/patterns/InfoTip';
import { useTranslate } from '@/contexts/I18nContext';
import { downloadCsv, toCsv } from '@/lib/utils/csv';
import { formatDate } from '@/lib/format/date';
import { ALL_CHARTS } from '@/components/charts/registry';
import { useProjectDashboard } from '@/modules/dashboard/hooks/useProjectDashboard';
import { useAssets } from '@/modules/equipment/hooks/useEquipment';
import { usePurchaseOrders } from '@/modules/procurement/hooks/useProcurement';
import { useExpenses } from '@/modules/expenses/hooks/useExpenses';
import { calculatePoTotalPaise } from '@/lib/calc/materials';
import { calculateCurrentIdleDays } from '@/lib/calc/equipment';

/**
 * The reports hub.
 * Every report here is generated from data already captured. Nothing on this
 * screen is hand authored, and the exports are limited to the ones a firm
 * actually needs: wage and muster, expenses, purchase orders and stock.
 */
export function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const dashboard = useProjectDashboard(projectId ?? null);
  const assetsQuery = useAssets();
  const ordersQuery = usePurchaseOrders();
  const expensesQuery = useExpenses(projectId ? [projectId] : []);

  /** Each export is a pure transform of data already on screen. */
  const exports = useMemo(
    () => [
      {
        key: 'labour',
        titleKey: 'reports.labour',
        explain: 'wagesPayable',
        run: () =>
          downloadCsv(
            `wage-summary-${projectId}.csv`,
            toCsv(dashboard.wageLines, [
              { header: 'Worker', value: (line) => line.worker_name },
              { header: 'Category', value: (line) => line.category },
              { header: 'Days worked', value: (line) => line.days_worked },
              { header: 'Overtime hours', value: (line) => line.overtime_hours },
              { header: 'Advances (Rs)', value: (line) => line.advances_paise / 100 },
              { header: 'Payable (Rs)', value: (line) => line.payable_paise / 100 },
            ]),
          ),
      },
      {
        key: 'materials',
        titleKey: 'reports.materials',
        explain: 'stockOnHand',
        run: () =>
          downloadCsv(
            `stock-${projectId}.csv`,
            toCsv(dashboard.stock, [
              { header: 'Material', value: (line) => line.name },
              { header: 'Unit', value: (line) => line.unit },
              { header: 'Received', value: (line) => line.received },
              { header: 'Issued', value: (line) => line.issued },
              { header: 'On hand', value: (line) => line.on_hand },
              { header: 'Low stock', value: (line) => (line.is_low ? 'Yes' : 'No') },
            ]),
          ),
      },
      {
        key: 'procurement',
        titleKey: 'reports.procurement',
        explain: 'purchaseOrderStatus',
        run: () =>
          downloadCsv(
            `purchase-orders-${projectId}.csv`,
            toCsv(
              (ordersQuery.data ?? []).filter((order) => order.project_id === projectId),
              [
                { header: 'PO number', value: (order) => order.po_number },
                { header: 'Vendor', value: (order) => order.vendor?.name ?? '' },
                { header: 'GSTIN', value: (order) => order.vendor?.gstin ?? '' },
                { header: 'Status', value: (order) => order.status },
                { header: 'Expected date', value: (order) => order.expected_date ?? '' },
                { header: 'Value (Rs)', value: (order) => calculatePoTotalPaise(order) / 100 },
              ],
            ),
          ),
      },
      {
        key: 'equipment',
        titleKey: 'reports.equipment',
        explain: 'equipmentUtilisation',
        run: () =>
          downloadCsv(
            'equipment-utilisation.csv',
            toCsv(assetsQuery.data ?? [], [
              { header: 'Asset', value: (asset) => asset.name },
              { header: 'Type', value: (asset) => asset.asset_type },
              { header: 'Ownership', value: (asset) => asset.ownership },
              { header: 'Status', value: (asset) => asset.status },
              { header: 'Current site', value: (asset) => asset.current_project?.name ?? '' },
              { header: 'Idle days', value: (asset) => calculateCurrentIdleDays(asset, []) },
              { header: 'Rental due', value: (asset) => asset.rental_due_date ?? '' },
            ]),
          ),
      },
      {
        key: 'expenses',
        titleKey: 'reports.expenses',
        explain: 'spendByCategory',
        run: () =>
          downloadCsv(
            `expenses-${projectId}.csv`,
            toCsv(expensesQuery.data ?? [], [
              { header: 'Date', value: (expense) => expense.spent_on },
              { header: 'Category', value: (expense) => expense.category },
              { header: 'Amount (Rs)', value: (expense) => expense.amount_paise / 100 },
              { header: 'Status', value: (expense) => expense.status },
              { header: 'Note', value: (expense) => expense.note ?? '' },
            ]),
          ),
      },
      {
        key: 'dpr',
        titleKey: 'reports.dailyReports',
        explain: 'dprCompliance',
        run: () =>
          downloadCsv(
            `daily-reports-${projectId}.csv`,
            toCsv(dashboard.dprs, [
              { header: 'Date', value: (dpr) => dpr.report_date },
              { header: 'Reported by', value: (dpr) => dpr.submitter?.full_name ?? '' },
              { header: 'Note', value: (dpr) => dpr.note ?? '' },
              { header: 'Tomorrow plan', value: (dpr) => dpr.tomorrow_plan ?? '' },
              { header: 'Submit seconds', value: (dpr) => dpr.dpr_timing_seconds ?? '' },
            ]),
          ),
      },
    ],
    [projectId, dashboard.wageLines, dashboard.stock, dashboard.dprs, ordersQuery.data, assetsQuery.data, expensesQuery.data],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('reports.title')} description={t('reports.subtitle')} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exports.map((report) => (
          <Card key={report.key}>
            <CardHeader
              title={t(report.titleKey)}
              adornment={<Explain name={report.explain} />}
            />
            <div className="p-4">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download className="size-3.5" />}
                onClick={report.run}
              >
                {t('reports.exportCsv')}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={t('reports.managementSummary')} />
        <div className="p-4">
          <p className="measure text-xs text-ink-muted">
            {t('reports.subtitle')}
          </p>
          <ul className="mt-3 flex flex-col gap-1.5">
            {ALL_CHARTS.map((chart) => (
              <li key={chart.id} className="flex items-center gap-1.5 text-2xs text-ink-muted">
                <span className="text-ink">{t(chart.titleKey)}</span>
                <Explain name={chart.explain} />
                <span className="ml-auto text-ink-faint">{chart.surfaces.join(', ')}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-2xs text-ink-faint">
            {t('common.period')}: {formatDate(new Date())}
          </p>
        </div>
      </Card>
    </div>
  );
}
