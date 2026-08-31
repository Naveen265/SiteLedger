import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { MetricTile } from '@/components/patterns/MetricTile';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatDate } from '@/lib/format/date';
import type { Dpr } from '@/types/domain';
import { useDprs } from '../hooks/useDpr';
import { DprDetailDialog } from '../components/DprDetailDialog';
import { SubmitDprDialog } from '../components/SubmitDprDialog';

/**
 * The daily report history.
 * The median submit time is shown as a headline number, because the sub sixty
 * second target is only meaningful if it is measured.
 */
export function DprListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useDprs(projectId ?? null);
  const [openDprId, setOpenDprId] = useState<string | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);

  const dprs = data ?? [];

  // The median is used rather than the mean, so one slow submission on a bad
  // connection does not hide the typical experience.
  const medianSeconds = useMemo(() => {
    const timings = dprs
      .map((dpr) => dpr.dpr_timing_seconds)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);
    if (timings.length === 0) return null;
    return timings[Math.floor(timings.length / 2)];
  }, [dprs]);

  const table = useTableState({
    rows: dprs,
    searchFields: [(dpr) => dpr.submitter?.full_name, (dpr) => dpr.note],
    initialSortKey: 'date',
    initialSortDirection: 'desc',
    comparators: { date: (a, b) => a.report_date.localeCompare(b.report_date) },
  });

  const columns = useMemo<Column<Dpr>[]>(
    () => [
      { key: 'date', header: t('common.date'), sortable: true, render: (dpr) => formatDate(dpr.report_date) },
      { key: 'reporter', header: t('dpr.reporter'), render: (dpr) => dpr.submitter?.full_name ?? '-' },
      { key: 'note', header: t('common.note'), hideOnMobile: true, render: (dpr) => dpr.note ?? '-' },
      {
        key: 'timing', header: t('dpr.medianTime'), align: 'right', hideOnMobile: true,
        render: (dpr) => (dpr.dpr_timing_seconds !== null ? `${dpr.dpr_timing_seconds}s` : '-'),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('dpr.title')}
        actions={
          can('dpr.submit') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setIsSubmitOpen(true)}>
              {t('dpr.submit')}
            </Button>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label={t('reports.dailyReports')}
          value={dprs.length}
          explain="dprCompliance"
          isLoading={isLoading}
        />
        <MetricTile
          label={t('dpr.medianTime')}
          value={medianSeconds !== null ? `${medianSeconds}s` : '-'}
          tone={medianSeconds !== null && medianSeconds <= 60 ? 'ontrack' : 'risk'}
          isLoading={isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        rows={table.rows}
        rowKey={(dpr) => dpr.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onRowClick={(dpr) => setOpenDprId(dpr.id)}
        emptyMessage={t('dpr.empty')}
        emptyAction={
          can('dpr.submit') && (
            <Button icon={<FileText className="size-4" />} onClick={() => setIsSubmitOpen(true)}>
              {t('dpr.submit')}
            </Button>
          )
        }
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <DprDetailDialog dprId={openDprId} onClose={() => setOpenDprId(null)} />
      <SubmitDprDialog open={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} projectId={projectId!} />
    </div>
  );
}
