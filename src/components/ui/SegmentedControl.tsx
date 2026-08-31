import { cn } from '@/lib/utils/cn';

/**
 * A small set of mutually exclusive choices, shown all at once.
 * Used for attendance marking, where a dropdown would cost a tap the site
 * team does not have to spare.
 */
export type Segment<T extends string> = {
  value: T;
  label: string;
  tone?: 'ontrack' | 'risk' | 'delayed' | 'neutral';
};

const ACTIVE_TONE: Record<string, string> = {
  ontrack: 'bg-status-ontrack text-white border-status-ontrack',
  risk: 'bg-status-risk text-white border-status-risk',
  delayed: 'bg-status-delayed text-white border-status-delayed',
  neutral: 'bg-primary text-white border-primary',
};

export function SegmentedControl<T extends string>({
  segments, value, onChange, label, size = 'md', className,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex rounded-[var(--radius-control)]', className)}>
      {segments.map((segment, index) => {
        const isActive = segment.value === value;
        return (
          <button
            key={segment.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(segment.value)}
            className={cn(
              'border font-medium transition-colors duration-150',
              size === 'sm' ? 'h-8 px-2.5 text-2xs' : 'h-11 min-w-11 px-3 text-xs',
              index === 0 && 'rounded-l-[var(--radius-control)]',
              index === segments.length - 1 && 'rounded-r-[var(--radius-control)]',
              index > 0 && '-ml-px',
              isActive
                ? ACTIVE_TONE[segment.tone ?? 'neutral']
                : 'border-border bg-surface text-ink-muted hover:bg-surface-subtle',
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
