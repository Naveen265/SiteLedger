import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Field } from './Field';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string;
  options: SelectOption[];
  hint?: string;
  error?: string;
  placeholder?: string;
  adornment?: React.ReactNode;
  wrapperClassName?: string;
};

/**
 * A labelled dropdown driven by an options array.
 * Option lists always come from the enum arrays in types/enums, never from
 * literals typed into a screen.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, hint, error, placeholder, adornment, wrapperClassName, className, required, ...props },
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
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cn(
              'h-10 w-full appearance-none rounded-[var(--radius-control)] border border-border',
              'bg-surface-sunken pl-3 pr-9 text-sm text-ink transition-colors duration-150',
              'focus:bg-surface focus:border-primary disabled:opacity-60',
              error && 'border-status-delayed',
              className,
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
        </div>
      )}
    </Field>
  );
});
