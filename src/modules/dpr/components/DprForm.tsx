import { useMemo, useRef, useState } from 'react';
import { Camera, ClipboardList, Package, Users, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Progress } from '@/components/ui/Progress';
import { PhotoUploader, type UploadedPhoto } from '@/components/patterns/PhotoUploader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { FormSkeleton } from '@/components/skeletons';
import { useTranslate } from '@/contexts/I18nContext';
import { formatDate, todayIso } from '@/lib/format/date';
import { formatWithUnit } from '@/lib/format/number';
import type { DprInput } from '@/lib/validation';
import type { Asset, Attendance, StockMovement, Task } from '@/types/domain';
import { calculateHeadcount } from '@/lib/calc/labour';

/**
 * The daily progress report form.
 * Everything the system already knows is shown, not asked for: the project,
 * the date, the reporter, the assigned tasks, today's attendance, today's
 * material issues and the equipment on site. The engineer supplies only work
 * done, photos, a note and tomorrow's plan.
 *
 * The elapsed time from opening this form to a successful submit is measured
 * and stored, so the sub sixty second target is a number, not an assumption.
 */
export function DprForm({
  tasks, attendance, stockIssues, assets, isLoading, isSubmitting, onSubmit,
  onMarkAttendance, onIssueMaterial,
}: {
  tasks: Task[];
  attendance: Attendance[];
  stockIssues: StockMovement[];
  assets: Asset[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onSubmit: (values: DprInput, photoPaths: string[], timingSeconds: number) => void;
  onMarkAttendance?: () => void;
  onIssueMaterial?: () => void;
}) {
  const t = useTranslate();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [note, setNote] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');

  // The stopwatch starts on the first render and is read once at submit, so the
  // clock is never called during a re-render.
  const openedAt = useRef<number | null>(null);
  openedAt.current ??= Date.now();

  // Only the sliders the engineer has actually moved are held as state. Every
  // other task reads its current progress straight from the task, so there is
  // no effect copying props into state and no second render to seed it.
  const [edited, setEdited] = useState<Record<string, number>>({});

  /** The value a slider should show: the edited one, or the task's own. */
  const progressFor = (taskId: string, current: number) => edited[taskId] ?? current;

  const headcount = useMemo(() => calculateHeadcount(attendance), [attendance]);

  /** Collects the form into the submit shape and reports the elapsed time. */
  const submit = () => {
    const timingSeconds = Math.round((Date.now() - (openedAt.current ?? Date.now())) / 1000);
    onSubmit(
      {
        report_date: todayIso(),
        note: note || undefined,
        tomorrow_plan: tomorrowPlan || undefined,
        weather: undefined,
        task_progress: tasks.map((task) => ({
          task_id: task.id,
          progress_pct: progressFor(task.id, task.progress_pct),
          quantity: null,
          unit: undefined,
        })),
      },
      photos.map((photo) => photo.path),
      timingSeconds,
    );
  };

  if (isLoading) return <FormSkeleton fields={6} />;

  return (
    <div className="flex flex-col gap-3">
      {/* Auto-pulled header. Nothing here is typed by the engineer. */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="text-2xs text-ink-muted">{t('common.date')}</p>
            <p className="text-sm font-semibold text-ink">{formatDate(todayIso())}</p>
          </div>
          <div className="text-right">
            <p className="text-2xs text-ink-muted">{t('labour.headcount')}</p>
            <p className="tabular text-sm font-semibold text-ink">{headcount}</p>
          </div>
        </div>
      </Card>

      {/* Work done today: the only block the engineer actively fills in. */}
      <Card>
        <CardHeader title={t('dpr.taskProgress')} />
        {tasks.length === 0 ? (
          <EmptyState icon={<ClipboardList className="size-6" />} message={t('dpr.noTasks')} />
        ) : (
          <ul className="divide-y divide-border">
            {tasks.map((task) => (
              <li key={task.id} className="p-4">
                <label htmlFor={`progress-${task.id}`} className="block text-xs font-medium text-ink">
                  {task.title}
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id={`progress-${task.id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={progressFor(task.id, task.progress_pct)}
                    onChange={(event) =>
                      setEdited((current) => ({ ...current, [task.id]: Number(event.target.value) }))
                    }
                    className="h-11 flex-1 accent-[var(--color-primary)]"
                  />
                  <span className="tabular w-12 text-right text-sm font-semibold text-ink">
                    {progressFor(task.id, task.progress_pct)}%
                  </span>
                </div>
                <Progress
                  value={progressFor(task.id, task.progress_pct)}
                  showLabel={false}
                  className="mt-1"
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Attendance already marked. Zero taps when the supervisor did it. */}
      <Card>
        <CardHeader
          title={t('dpr.attendanceBlock')}
          actions={
            attendance.length === 0 && onMarkAttendance && (
              <Button variant="secondary" size="sm" icon={<Users className="size-3.5" />} onClick={onMarkAttendance}>
                {t('dpr.markAttendanceShortcut')}
              </Button>
            )
          }
        />
        <div className="p-4">
          {attendance.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('labour.emptyAttendance')}</p>
          ) : (
            <p className="text-xs text-ink">
              <span className="tabular font-semibold">{headcount}</span>{' '}
              {t('labour.present').toLowerCase()}
              {' · '}
              <span className="tabular">{attendance.filter((row) => row.day_value === 0.5).length}</span>{' '}
              {t('labour.halfDay').toLowerCase()}
            </p>
          )}
        </div>
      </Card>

      {/* Materials already issued today. Also zero taps. */}
      <Card>
        <CardHeader
          title={t('dpr.materialsBlock')}
          actions={
            stockIssues.length === 0 && onIssueMaterial && (
              <Button variant="secondary" size="sm" icon={<Package className="size-3.5" />} onClick={onIssueMaterial}>
                {t('dpr.addMaterialShortcut')}
              </Button>
            )
          }
        />
        <div className="p-4">
          {stockIssues.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('materials.emptyStock')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {stockIssues.map((movement) => (
                <li key={movement.id} className="flex justify-between text-xs">
                  <span className="text-ink">{movement.material_item?.name}</span>
                  <span className="tabular text-ink-muted">
                    {formatWithUnit(movement.quantity, movement.material_item?.unit ?? '')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Equipment currently allocated to this site. */}
      <Card>
        <CardHeader title={t('dpr.equipmentBlock')} />
        <div className="p-4">
          {assets.length === 0 ? (
            <p className="text-xs text-ink-muted">{t('equipment.empty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2 py-1 text-2xs text-ink"
                >
                  <Wrench className="size-3 text-ink-faint" aria-hidden />
                  {asset.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={t('common.photos')} />
        <div className="p-4">
          <PhotoUploader bucket="dpr-photos" scope="dpr" value={photos} onChange={setPhotos} max={8} />
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4 p-4">
          <Textarea
            label={t('common.note')}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Textarea
            label={t('dpr.tomorrowPlan')}
            rows={2}
            value={tomorrowPlan}
            onChange={(event) => setTomorrowPlan(event.target.value)}
          />
        </div>
      </Card>

      <Button size="lg" fullWidth icon={<Camera className="size-4" />} onClick={submit} isLoading={isSubmitting}>
        {t('dpr.submit')}
      </Button>
    </div>
  );
}
