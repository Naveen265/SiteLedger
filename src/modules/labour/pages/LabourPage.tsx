import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { subDays } from 'date-fns';
import { PageHeader } from '@/components/patterns/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { chartTheme, axisProps } from '@/components/charts/theme';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { todayIso, toIsoDate, formatDate } from '@/lib/format/date';
import { calculateHeadcountTrend, calculateWageSummary } from '@/lib/calc/labour';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdvances, useAttendance, useSaveAttendance, useWorkers } from '../hooks/useLabour';
import { AttendanceSheet } from '../components/AttendanceSheet';
import { WageSummaryTable } from '../components/WageSummaryTable';
import { WorkerListTable } from '../components/WorkerListTable';
import { WorkerFormDialog } from '../components/WorkerFormDialog';

/**
 * The labour module.
 * Attendance, the worker master and the wage summary are three views of the
 * same data, so they live on one screen rather than three routes.
 */
export function LabourPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const [tab, setTab] = useState<'attendance' | 'wages' | 'workers'>('attendance');
  const [date, setDate] = useState(todayIso());
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);

  // The wage period defaults to the last thirty days, which is the window
  // most firms settle labour over.
  const periodFrom = toIsoDate(subDays(new Date(), 30));
  const periodTo = todayIso();

  const workersQuery = useWorkers();
  const dayAttendanceQuery = useAttendance(projectId ?? null, date, date);
  const periodAttendanceQuery = useAttendance(projectId ?? null, periodFrom, periodTo);
  const advancesQuery = useAdvances(periodFrom, periodTo);
  const saveAttendance = useSaveAttendance(projectId ?? '', date);

  const workers = workersQuery.data ?? [];

  const wageLines = useMemo(
    () =>
      calculateWageSummary(
        workers,
        periodAttendanceQuery.data ?? [],
        advancesQuery.data ?? [],
      ),
    [workers, periodAttendanceQuery.data, advancesQuery.data],
  );

  const headcountTrend = useMemo(
    () =>
      calculateHeadcountTrend(periodAttendanceQuery.data ?? []).map((point) => ({
        ...point,
        label: formatDate(point.date),
      })),
    [periodAttendanceQuery.data],
  );

  const addWorkerButton = can('worker.manage') && (
    <Button icon={<Plus className="size-4" />} onClick={() => setIsWorkerFormOpen(true)}>
      {t('labour.addWorker')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('labour.title')} actions={addWorkerButton} />

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as typeof tab)}
        items={[
          { value: 'attendance', label: t('labour.attendance') },
          { value: 'wages', label: t('labour.wageSummary') },
          { value: 'workers', label: t('labour.workers'), count: workers.length },
        ]}
      />

      {tab === 'attendance' && (
        <div className="flex flex-col gap-4">
          <Input
            label={t('common.date')}
            type="date"
            value={date}
            max={todayIso()}
            onChange={(event) => setDate(event.target.value)}
            wrapperClassName="max-w-44"
          />

          <AttendanceSheet
            key={date}
            workers={workers}
            existing={dayAttendanceQuery.data ?? []}
            isLoading={workersQuery.isLoading || dayAttendanceQuery.isLoading}
            onSave={(marks) => saveAttendance.mutateAsync(marks)}
            emptyAction={addWorkerButton}
          />

          <ChartCard
            chartId="labourHeadcount"
            isLoading={periodAttendanceQuery.isLoading}
            isEmpty={headcountTrend.length === 0}
            emptyMessage={t('labour.emptyAttendance')}
          >
            <BarChart data={headcountTrend}>
              <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} vertical={false} />
              <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} {...axisProps} width={32} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
              <Bar dataKey="headcount" name={t('labour.headcount')} fill={chartTheme.primary} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {tab === 'wages' && (
        <WageSummaryTable
          lines={wageLines}
          isLoading={periodAttendanceQuery.isLoading || workersQuery.isLoading}
          isError={periodAttendanceQuery.isError}
          onRetry={() => void periodAttendanceQuery.refetch()}
          periodLabel={`${periodFrom}-to-${periodTo}`}
        />
      )}

      {tab === 'workers' && (
        <WorkerListTable
          workers={workers}
          isLoading={workersQuery.isLoading}
          isError={workersQuery.isError}
          onRetry={() => void workersQuery.refetch()}
          emptyAction={addWorkerButton}
        />
      )}

      <WorkerFormDialog open={isWorkerFormOpen} onClose={() => setIsWorkerFormOpen(false)} />
    </div>
  );
}
