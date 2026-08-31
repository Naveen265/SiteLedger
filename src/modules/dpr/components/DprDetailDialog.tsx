import { Dialog } from '@/components/ui/Dialog';
import { Progress } from '@/components/ui/Progress';
import { StoredImage } from '@/components/patterns/StoredImage';
import { ListSkeleton } from '@/components/skeletons';
import { useTranslate } from '@/contexts/I18nContext';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { useDprDetail } from '../hooks/useDpr';

/** A submitted daily report, read only. */
export function DprDetailDialog({
  dprId, onClose,
}: {
  dprId: string | null;
  onClose: () => void;
}) {
  const t = useTranslate();
  const { data, isLoading } = useDprDetail(dprId);

  return (
    <Dialog
      open={Boolean(dprId)}
      onClose={onClose}
      title={data ? formatDate(data.dpr.report_date) : t('dpr.title')}
      description={data?.dpr.submitter?.full_name}
      size="lg"
    >
      {isLoading || !data ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-2xs text-ink-muted">
            {t('dpr.reporter')}: {data.dpr.submitter?.full_name} ·{' '}
            {formatDateTime(data.dpr.submitted_at)}
            {data.dpr.dpr_timing_seconds !== null && ` · ${data.dpr.dpr_timing_seconds}s`}
          </p>

          <div>
            <p className="mb-2 text-xs font-medium text-ink">{t('dpr.taskProgress')}</p>
            {data.taskProgress.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('dpr.noTasks')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.taskProgress.map((row) => (
                  <li key={row.id}>
                    <p className="text-xs text-ink">{row.task?.title}</p>
                    <Progress value={row.progress_pct} className="mt-1" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {data.photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-ink">{t('common.photos')}</p>
              <div className="flex flex-wrap gap-2">
                {data.photos.map((photo) => (
                  <StoredImage
                    key={photo.id}
                    bucket="dpr-photos"
                    path={photo.storage_path}
                    alt={t('dpr.title')}
                    className="size-24 rounded-[var(--radius-control)] border border-border"
                  />
                ))}
              </div>
            </div>
          )}

          {data.dpr.note && (
            <div>
              <p className="text-xs font-medium text-ink">{t('common.note')}</p>
              <p className="measure mt-1 text-xs text-ink-muted">{data.dpr.note}</p>
            </div>
          )}

          {data.dpr.tomorrow_plan && (
            <div>
              <p className="text-xs font-medium text-ink">{t('dpr.tomorrowPlan')}</p>
              <p className="measure mt-1 text-xs text-ink-muted">{data.dpr.tomorrow_plan}</p>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
