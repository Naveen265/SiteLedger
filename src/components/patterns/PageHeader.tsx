import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The heading block every screen starts with.
 * Sentence case, never title case, and the primary action sits at the top
 * right on desktop and stacks under the title on mobile.
 */
export function PageHeader({
  title, description, actions, breadcrumb, className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumb && <div className="mb-1 text-2xs text-ink-muted">{breadcrumb}</div>}
        <h1 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        {description && <p className="measure mt-1 text-xs text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
