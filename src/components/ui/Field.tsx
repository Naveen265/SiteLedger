import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The label, hint, error and layout wrapper shared by every form control.
 * Every field in the product has a real label element wired to its input.
 */
export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Rendered beside the label, used for the info tooltip on calculated fields. */
  adornment?: ReactNode;
  className?: string;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
};

export function Field({ label, hint, error, required, adornment, className, children }: FieldProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-xs font-medium text-ink">
          {label}
          {required && <span className="text-status-delayed"> *</span>}
        </label>
        {adornment}
      </div>

      {children({ inputId, describedBy })}

      {hint && !error && (
        <p id={hintId} className="text-2xs text-ink-muted">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-2xs text-status-delayed">{error}</p>
      )}
    </div>
  );
}
