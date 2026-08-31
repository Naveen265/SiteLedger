import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The empty state.
 * Every empty state gives direction. It says what is missing and offers the
 * action that fixes it. It is never the word "No data".
 */
export function EmptyState({
  icon, message, action, className,
}: {
  icon?: ReactNode;
  /** Full sentence explaining what is missing and what to do next. */
  message: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      {icon && <span className="text-ink-faint" aria-hidden>{icon}</span>}
      <p className="measure text-xs text-ink-muted">{message}</p>
      {action}
    </div>
  );
}
