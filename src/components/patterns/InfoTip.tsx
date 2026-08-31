import { useEffect, useId, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useHoverCapable } from '@/hooks/useMediaQuery';
import { useTranslate } from '@/contexts/I18nContext';

/**
 * The explainability control.
 * Every calculated number in the product carries one of these. It opens on
 * hover on pointer devices and on tap on touch devices, because a hover-only
 * tooltip is unusable on the phones the site team carries.
 *
 * Content comes from the explain namespace in the message files, so the
 * explanation translates with the rest of the interface, and a unit test
 * asserts every chart in the registry has a matching explain key.
 */
export function InfoTip({
  titleKey, bodyKey, formulaKey, className,
}: {
  /** Message key for the short title, for example explain.wagesPayable.title */
  titleKey: string;
  bodyKey: string;
  formulaKey?: string;
  className?: string;
}) {
  const t = useTranslate();
  const canHover = useHoverCapable();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<number>(0);
  const panelId = useId();

  const title = t(titleKey);
  const body = t(bodyKey);
  const formula = formulaKey ? t(formulaKey) : undefined;

  // Close on Escape, and on a click anywhere outside the control.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [isOpen]);

  // Clear any pending open timer when the control unmounts.
  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  /** On pointer devices the panel opens after a short hover delay. */
  const onMouseEnter = () => {
    if (!canHover) return;
    openTimer.current = window.setTimeout(() => setIsOpen(true), 200);
  };

  const onMouseLeave = () => {
    if (!canHover) return;
    window.clearTimeout(openTimer.current);
    setIsOpen(false);
  };

  return (
    <span ref={containerRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={`About ${title}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        onFocus={() => setIsOpen(true)}
        onBlur={(event) => {
          // Keep the panel open while focus is still inside it.
          if (!containerRef.current?.contains(event.relatedTarget as Node)) setIsOpen(false);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="inline-flex items-center justify-center rounded-full text-ink-faint hover:text-ink-muted"
      >
        <Info className="size-3.5" aria-hidden />
      </button>

      {isOpen && (
        <span
          id={panelId}
          role="tooltip"
          className={cn(
            'absolute left-0 top-full z-40 mt-1.5 block w-72 max-w-[min(18rem,80vw)]',
            'rounded-[var(--radius-card)] border border-border bg-surface p-3',
            'text-left shadow-[var(--shadow-overlay)]',
          )}
        >
          <span className="block text-xs font-semibold text-ink">{title}</span>
          <span className="mt-1 block text-2xs leading-relaxed text-ink-muted">{body}</span>
          {formula && (
            <code className="mt-2 block rounded-[var(--radius-control)] bg-surface-sunken px-2 py-1.5 font-mono text-2xs text-ink-muted">
              {formula}
            </code>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * Builds the three message keys for an explain entry from its name, so callers
 * write `<Explain name="wagesPayable" />` instead of three key strings.
 */
export function Explain({ name, withFormula = true, className }: {
  name: string;
  withFormula?: boolean;
  className?: string;
}) {
  return (
    <InfoTip
      titleKey={`explain.${name}.title`}
      bodyKey={`explain.${name}.body`}
      formulaKey={withFormula ? `explain.${name}.formula` : undefined}
      className={className}
    />
  );
}
