import { cn } from '@/lib/utils/cn';

/**
 * A progress bar.
 * The percentage is always shown as a number beside the bar, because a bar
 * alone is not readable at arm's length on a site.
 */
export function Progress({
  value, showLabel = true, tone = 'primary', className,
}: {
  value: number;
  showLabel?: boolean;
  tone?: 'primary' | 'ontrack' | 'risk' | 'delayed';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fillClass = {
    primary: 'bg-primary',
    ontrack: 'bg-status-ontrack',
    risk: 'bg-status-risk',
    delayed: 'bg-status-delayed',
  }[tone];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-150', fillClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="tabular w-9 shrink-0 text-right text-2xs text-ink-muted">{clamped}%</span>
      )}
    </div>
  );
}
