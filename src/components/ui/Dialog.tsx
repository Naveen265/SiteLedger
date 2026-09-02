import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { IconButton } from './IconButton';
import { useTranslate } from '@/contexts/I18nContext';

/**
 * A modal dialog.
 * Focus moves into the dialog on open and returns to the trigger on close.
 * Escape closes it, and the surrounding page is inert while it is open.
 */
export function Dialog({
  open, onClose, title, description, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Held in a ref so the effect below can depend on `open` alone. Callers pass
  // an inline arrow function, which is a new identity on every render; if the
  // effect depended on it, every keystroke would tear the effect down and run
  // it again, stealing focus back to the top of the dialog mid-typing.
  //
  // Updated in its own effect rather than during render: writing to a ref while
  // rendering is unsafe under concurrent rendering, and this effect's deps are
  // separate so it never disturbs the focus effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Trap focus, restore it on close, and close on Escape.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // Focus the first field in the body, not the panel. Searching the whole
    // panel finds the header's close button first in DOM order, which puts the
    // caret nowhere and reads as the dialog fighting the user.
    const focusTimer = window.setTimeout(() => {
      const firstField = bodyRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]), select, textarea',
      );
      (firstField ?? bodyRef.current)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();
    };
    // Deliberately only `open`: see onCloseRef above.
  }, [open]);

  const t = useTranslate();
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-surface',
          'rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)]',
          'shadow-[var(--shadow-overlay)]',
          size === 'sm' && 'sm:max-w-md',
          size === 'md' && 'sm:max-w-xl',
          size === 'lg' && 'sm:max-w-3xl',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-md font-semibold text-ink">{title}</h2>
            {description && <p className="mt-0.5 measure text-xs text-ink-muted">{description}</p>}
          </div>
          <IconButton label={t('common.close')} icon={<X className="size-4" />} onClick={onClose} />
        </div>

        <div ref={bodyRef} className="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
