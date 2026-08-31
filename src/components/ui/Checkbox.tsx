import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  hint?: string;
};

/** A labelled checkbox with a touch target large enough for the site shell. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, className, ...props },
  ref,
) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded-[3px] border-border-strong accent-[var(--color-primary)]',
          className,
        )}
        {...props}
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-xs text-ink">{label}</span>
        {hint && <span className="block text-2xs text-ink-muted">{hint}</span>}
      </label>
    </div>
  );
});
