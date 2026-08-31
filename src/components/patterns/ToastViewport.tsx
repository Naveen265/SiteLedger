import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { IconButton } from '@/components/ui/IconButton';

/** Renders the queued messages. Mounted once, at the root of the app. */
export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  const t = useTranslate();

  if (toasts.length === 0) return null;

  const ICONS = {
    success: <CheckCircle2 className="size-4 text-status-ontrack" aria-hidden />,
    error: <AlertCircle className="size-4 text-status-delayed" aria-hidden />,
    info: <Info className="size-4 text-primary" aria-hidden />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-2.5',
            'rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5',
            'shadow-[var(--shadow-overlay)]',
          )}
        >
          <span className="mt-0.5 shrink-0">{ICONS[toast.tone]}</span>
          <p className="flex-1 text-xs text-ink">{toast.message}</p>
          <IconButton
            label={t('common.close')}
            icon={<X className="size-3.5" />}
            size="sm"
            onClick={() => dismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
