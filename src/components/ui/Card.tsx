import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The card surface.
 * Cards use a border, never a shadow. The single shadow token is reserved for
 * overlays and popovers so the page stays flat and legible in sunlight.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-border bg-surface',
        className,
      )}
      {...props}
    />
  );
}

/** Card header: a title, optional info icon, and optional trailing actions. */
export function CardHeader({
  title, subtitle, adornment, actions, className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  adornment?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-border px-4 py-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
          {adornment}
        </div>
        {subtitle && <p className="mt-0.5 text-2xs text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Card body with the standard padding. */
export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}
