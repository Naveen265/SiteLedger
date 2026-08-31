import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { useTranslate } from '@/contexts/I18nContext';
import { formatPaise } from '@/lib/format/currency';
import { formatQuantity } from '@/lib/format/number';
import { downloadCsv, toCsv } from '@/lib/utils/csv';
import { calculateTotalPayablePaise, type WageLine } from '@/lib/calc/labour';

/**
 * The wage summary.
 * Every calculated column carries the info icon that explains it, and the
 * screen states plainly that this is not statutory payroll.
 */
export function WageSummaryTable({
  lines, isLoading, isError, onRetry, periodLabel,
}: {
  lines: WageLine[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  periodLabel: string;
}) {
  const t = useTranslate();

  const columns = useMemo<Column<WageLine>[]>(
    () => [
      { key: 'worker', header: t('common.worker'), render: (line) => (
        <div>
          <p className="font-medium text-ink">{line.worker_name}</p>
          <p className="text-2xs text-ink-muted">{line.category}</p>
        </div>
      ) },
      {
        key: 'contractor', header: t('labour.contractor'), hideOnMobile: true,
        render: (line) => line.contractor_name ?? '-',
      },
      {
        key: 'rate', header: t('labour.dailyRate'), align: 'right',
        render: (line) => formatPaise(line.daily_rate_paise),
      },
      {
        key: 'days', header: t('labour.daysWorked'), align: 'right', explain: 'halfDay',
        render: (line) => formatQuantity(line.days_worked),
      },
      {
        key: 'overtime', header: t('labour.overtime'), align: 'right', hideOnMobile: true,
        render: (line) => formatQuantity(line.overtime_hours),
      },
      {
        key: 'advances', header: t('labour.advances'), align: 'right', hideOnMobile: true,
        render: (line) => formatPaise(line.advances_paise),
      },
      {
        key: 'payable', header: t('labour.wagesPayable'), align: 'right', explain: 'wagesPayable',
        render: (line) => (
          <span className="font-semibold text-ink">{formatPaise(line.payable_paise)}</span>
        ),
      },
    ],
    [t],
  );

  /** Exports the visible wage lines in a column layout Tally can read. */
  const exportCsv = () => {
    const csv = toCsv(lines, [
      { header: 'Worker', value: (line) => line.worker_name },
      { header: 'Category', value: (line) => line.category },
      { header: 'Contractor', value: (line) => line.contractor_name ?? '' },
      { header: 'Daily rate (Rs)', value: (line) => line.daily_rate_paise / 100 },
      { header: 'Days worked', value: (line) => line.days_worked },
      { header: 'Present days', value: (line) => line.present_days },
      { header: 'Half days', value: (line) => line.half_days },
      { header: 'Overtime hours', value: (line) => line.overtime_hours },
      { header: 'Base (Rs)', value: (line) => line.base_paise / 100 },
      { header: 'Overtime (Rs)', value: (line) => line.overtime_paise / 100 },
      { header: 'Advances (Rs)', value: (line) => line.advances_paise / 100 },
      { header: 'Payable (Rs)', value: (line) => line.payable_paise / 100 },
    ]);
    downloadCsv(`wage-summary-${periodLabel}.csv`, csv);
  };

  const total = calculateTotalPayablePaise(lines);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('labour.wageSummary')}
        subtitle={t('labour.notPayroll')}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="size-3.5" />}
            onClick={exportCsv}
            disabled={lines.length === 0}
          >
            {t('reports.exportCsv')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={lines}
        rowKey={(line) => line.worker_id}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        emptyMessage={t('labour.emptyAttendance')}
        className="rounded-none border-0"
      />

      {lines.length > 0 && !isLoading && (
        <div className="flex items-center justify-between border-t border-border bg-surface-subtle px-4 py-3">
          <span className="text-xs font-medium text-ink">{t('common.total')}</span>
          <span className="tabular text-sm font-semibold text-ink">{formatPaise(total)}</span>
        </div>
      )}
    </Card>
  );
}
