import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { Field } from './Field';

const BASE_INPUT =
  'w-full rounded-[var(--radius-control)] border border-border bg-surface-sunken px-3 ' +
  'text-sm text-ink placeholder:text-ink-faint transition-colors duration-150 ' +
  'focus:bg-surface focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  adornment?: React.ReactNode;
  wrapperClassName?: string;
};

/** A labelled text input. Numeric inputs align their digits with the tables. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, adornment, wrapperClassName, className, required, type = 'text', ...props },
  ref,
) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      adornment={adornment}
      className={wrapperClassName}
    >
      {({ inputId, describedBy }) => (
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(
            BASE_INPUT,
            'h-10',
            (type === 'number' || type === 'tel') && 'tabular',
            error && 'border-status-delayed',
            className,
          )}
          {...props}
        />
      )}
    </Field>
  );
});
