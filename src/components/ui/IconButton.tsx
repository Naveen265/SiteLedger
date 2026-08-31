import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * An icon-only control.
 * The label prop is required and becomes the accessible name, because an
 * icon-only button with no aria-label is unusable with a screen reader.
 */
export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md';
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-control)]',
        'text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors duration-150',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'size-8' : 'size-10',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
