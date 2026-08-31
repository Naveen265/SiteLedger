import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { Explain } from './InfoTip';

/**
 * A single headline number on a dashboard.
 * Every tile that shows a derived number carries an info icon naming the
 * explain entry that describes how the number was produced.
 */
export function MetricTile({
  label, value, sublabel, explain, tone = 'default', isLoading, action, className,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  /** Name of the explain entry, for example "spendToDate". */
  explain?: string;
  tone?: 'default' | 'ontrack' | 'risk' | 'delayed';
  isLoading?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  const valueTone = {
    default: 'text-ink',
    ontrack: 'text-status-ontrack',
    risk: 'text-status-risk',
    delayed: 'text-status-delayed',
  }[tone];

  return (
    <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface p-4', className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs font-medium uppercase-none text-ink-muted">{label}</span>
        {explain && <Explain name={explain} />}
      </div>

      {isLoading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p className={cn('tabular mt-1.5 text-xl font-semibold tracking-[-0.02em]', valueTone)}>
          {value}
        </p>
      )}

      {sublabel && !isLoading && <p className="mt-0.5 text-2xs text-ink-muted">{sublabel}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
