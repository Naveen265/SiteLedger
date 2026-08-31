import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { useTranslate } from '@/contexts/I18nContext';

/**
 * The error state.
 * Every error says what happened and what to do about it, and offers a retry
 * where retrying is actually the fix.
 */
export function ErrorState({
  message, onRetry, className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useTranslate();
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}
    >
      <AlertTriangle className="size-6 text-status-delayed" aria-hidden />
      <p className="measure text-xs text-ink-muted">{message ?? t('errors.load')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
