import { useMemo, useState } from 'react';
import { CheckCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Explain } from '@/components/patterns/InfoTip';
import { ListSkeleton } from '@/components/skeletons';
import { useTranslate } from '@/contexts/I18nContext';
import { formatPaise } from '@/lib/format/currency';
import type { Attendance, Worker } from '@/types/domain';
import type { AttendanceMark } from '../api/labourApi';

/**
 * Attendance marking.
 * The target is two taps for a team of thirty: one to mark everyone present,
 * then adjust the exceptions. A dropdown per worker would cost thirty taps,
 * which is exactly the friction that stops people using the incumbent.
 */

type DayValue = '1' | '0.5' | '0';

export function AttendanceSheet({
  workers, existing, isLoading, onSave, emptyAction,
}: {
  workers: Worker[];
  existing: Attendance[];
  isLoading?: boolean;
  /** Awaited, so the save button stays busy until the write settles. */
  onSave: (marks: AttendanceMark[]) => void | Promise<unknown>;
  emptyAction?: React.ReactNode;
}) {
  const t = useTranslate();

  // What is already saved for this date and these workers. Recomputed rather
  // than copied into state, so switching date never shows a stale sheet.
  const saved = useMemo(() => {
    const seeded: Record<string, { dayValue: DayValue; overtime: number }> = {};
    for (const worker of workers) {
      const row = existing.find((entry) => entry.worker_id === worker.id);
      seeded[worker.id] = {
        dayValue: String(row?.day_value ?? 0) as DayValue,
        overtime: row?.overtime_hours ?? 0,
      };
    }
    return seeded;
  }, [workers, existing]);

  // Only the marks the supervisor has actually changed are held as state. The
  // date is the reset key, so a new date starts from what is saved for it.
  const [edited, setEdited] = useState<Record<string, { dayValue: DayValue; overtime: number }>>({});
  const marks = useMemo(() => ({ ...saved, ...edited }), [saved, edited]);

  /** Marks every worker present in one tap. Exceptions are adjusted after. */
  const markAllPresent = () => {
    setEdited(
      Object.fromEntries(
        workers.map((worker) => [
          worker.id,
          { dayValue: '1' as DayValue, overtime: marks[worker.id]?.overtime ?? 0 },
        ]),
      ),
    );
  };

  /** Sets one worker's day value. */
  const setDayValue = (workerId: string, dayValue: DayValue) => {
    setEdited((current) => ({
      ...current,
      [workerId]: { dayValue, overtime: marks[workerId]?.overtime ?? 0 },
    }));
  };

  /** Sets one worker's overtime hours. */
  const setOvertime = (workerId: string, overtime: number) => {
    setEdited((current) => ({
      ...current,
      [workerId]: { dayValue: marks[workerId]?.dayValue ?? '0', overtime },
    }));
  };

  // The running headcount tells the supervisor whether the sheet is complete.
  const presentCount = useMemo(
    () => Object.values(marks).filter((mark) => Number(mark.dayValue) > 0).length,
    [marks],
  );

  /** Hands every worker's mark to the caller as one batch. */
  const save = () =>
    onSave(
      workers.map((worker) => ({
        worker_id: worker.id,
        day_value: Number(marks[worker.id]?.dayValue ?? 0),
        overtime_hours: marks[worker.id]?.overtime ?? 0,
      })),
    );

  if (isLoading) return <ListSkeleton rows={6} />;

  if (workers.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Users className="size-6" />}
          message={t('labour.emptyWorkers')}
          action={emptyAction}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t('labour.attendance')}
        subtitle={`${presentCount} ${t('common.of')} ${workers.length} ${t('labour.present').toLowerCase()}`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="size-3.5" />}
            onClick={markAllPresent}
          >
            {t('labour.markAllPresent')}
          </Button>
        }
      />

      <ul className="divide-y divide-border">
        {workers.map((worker) => {
          const mark = marks[worker.id] ?? { dayValue: '0' as DayValue, overtime: 0 };
          return (
            <li key={worker.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink">{worker.full_name}</p>
                <p className="truncate text-2xs text-ink-muted">
                  {worker.category}
                  {worker.contractor?.name ? ` · ${worker.contractor.name}` : ''}
                  {' · '}
                  <span className="tabular">{formatPaise(worker.daily_rate_paise)}</span>
                </p>
              </div>

              <SegmentedControl<DayValue>
                label={`${t('labour.attendance')} ${worker.full_name}`}
                value={mark.dayValue}
                onChange={(value) => setDayValue(worker.id, value)}
                segments={[
                  { value: '1', label: t('labour.present'), tone: 'ontrack' },
                  { value: '0.5', label: t('labour.halfDay'), tone: 'risk' },
                  { value: '0', label: t('labour.absent'), tone: 'delayed' },
                ]}
              />

              <Input
                label={t('labour.overtime')}
                type="number"
                min={0}
                max={12}
                step={0.5}
                value={mark.overtime}
                onChange={(event) => setOvertime(worker.id, Number(event.target.value))}
                wrapperClassName="w-24"
                className="h-11"
              />
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="flex items-center gap-1 text-2xs text-ink-muted">
          {t('labour.halfDay')}
          <Explain name="halfDay" withFormula={false} />
        </p>
        <AsyncButton size="lg" onClick={save}>
          {t('common.save')}
        </AsyncButton>
      </div>
    </Card>
  );
}
