import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useTranslate } from '@/contexts/I18nContext';

/**
 * Confirmation for an action that is hard to reverse.
 * The confirm button names the action, so the user reads "Archive project",
 * never "OK".
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel, tone = 'primary', isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  isLoading?: boolean;
}) {
  const t = useTranslate();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="measure text-xs text-ink-muted">{message}</p>
    </Dialog>
  );
}
