import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { newId } from '@/lib/utils/id';

/**
 * Transient messages.
 * Every message says what happened. Error messages additionally say what to do
 * about it; that copy is written at the call site, not generated here.
 */

export type ToastTone = 'success' | 'error' | 'info';
export type Toast = { id: string; tone: ToastTone; message: string };

type ToastContextValue = {
  toasts: Toast[];
  /** Shows a message and removes it automatically. */
  notify: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** How long a message stays on screen, in milliseconds. */
const TOAST_DURATION = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /** Removes one message, by id. */
  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  /** Adds a message and schedules its removal. */
  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = newId();
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

/** Reads the toast context. Throws if used outside the provider. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
