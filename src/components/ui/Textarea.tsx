import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { Field } from './Field';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/** A labelled multi-line input, used for notes, descriptions and resolutions. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, required, rows = 3, ...props },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ inputId, describedBy }) => (
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            'w-full rounded-[var(--radius-control)] border border-border bg-surface-sunken px-3 py-2',
            'text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 resize-y',
            'focus:bg-surface focus:border-primary',
            error && 'border-status-delayed',
            className,
          )}
          {...props}
        />
      )}
    </Field>
  );
});
