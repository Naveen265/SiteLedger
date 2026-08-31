import { cn } from '@/lib/utils/cn';

/**
 * Status is always a colour paired with a text label, never colour alone.
 * Colour alone fails for colour blind users and it fails in direct sunlight,
 * which is where half of this product is used.
 */

export type StatusTone = 'ontrack' | 'risk' | 'delayed' | 'idle' | 'neutral' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  ontrack: 'bg-[color-mix(in_srgb,var(--color-status-ontrack)_12%,white)] text-status-ontrack border-[color-mix(in_srgb,var(--color-status-ontrack)_30%,white)]',
  risk: 'bg-[color-mix(in_srgb,var(--color-status-risk)_12%,white)] text-status-risk border-[color-mix(in_srgb,var(--color-status-risk)_30%,white)]',
  delayed: 'bg-[color-mix(in_srgb,var(--color-status-delayed)_12%,white)] text-status-delayed border-[color-mix(in_srgb,var(--color-status-delayed)_30%,white)]',
  idle: 'bg-[color-mix(in_srgb,var(--color-status-idle)_12%,white)] text-status-idle border-[color-mix(in_srgb,var(--color-status-idle)_30%,white)]',
  neutral: 'bg-surface-subtle text-ink-muted border-border',
  info: 'bg-primary-subtle text-primary border-[color-mix(in_srgb,var(--color-primary)_25%,white)]',
};

export function StatusChip({
  label, tone = 'neutral', size = 'md', className,
}: {
  label: string;
  tone?: StatusTone;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-[var(--radius-control)] border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-2xs',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
