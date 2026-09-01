import { forwardRef, useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Button, type ButtonProps } from './Button';

/**
 * A button that owns the pending state of its own action.
 *
 * Every control that triggers a network call uses this. It disables itself and
 * shows an inline spinner for as long as the action is running, and it ignores
 * further clicks while that is true, so a double tap cannot submit twice.
 *
 * Why this exists rather than passing `isLoading={mutation.isPending}`: a
 * mutation hook is shared by every row of a table, so its pending flag is true
 * for all of them at once. Approving one expense would spin the button on every
 * other row. Pending state belongs to the button that was actually pressed, so
 * it is held here, per instance.
 */
export type AsyncButtonProps = Omit<ButtonProps, 'onClick' | 'isLoading'> & {
  /** The action to run. Awaited, so the button stays busy until it settles. */
  onClick: (event: MouseEvent<HTMLButtonElement>) => unknown | Promise<unknown>;
  /** Stops the click reaching a clickable table row underneath. */
  stopPropagation?: boolean;
};

export const AsyncButton = forwardRef<HTMLButtonElement, AsyncButtonProps>(function AsyncButton(
  { onClick, stopPropagation, disabled, ...props },
  ref,
) {
  const [isPending, setIsPending] = useState(false);

  // A dialog often closes as its action succeeds, unmounting this button. The
  // ref stops the completion handler setting state on a gone component.
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      if (stopPropagation) event.stopPropagation();
      // The guard is what makes a double tap safe, independent of the disabled
      // attribute, which React may not have applied yet on a fast second click.
      if (isPending) return;

      setIsPending(true);
      try {
        await onClick(event);
      } catch (error) {
        // The action's own error handling shows the message: every mutation in
        // this application reports failures as a toast. Letting the rejection
        // escape here would additionally log an unhandled promise rejection to
        // the console on every failed click, which is noise, not information.
        // It is still surfaced during development so a genuinely unhandled
        // failure is not hidden from whoever is working on it.
        if (import.meta.env.DEV) console.error('AsyncButton action failed', error);
      } finally {
        if (isMounted.current) setIsPending(false);
      }
    },
    [onClick, isPending, stopPropagation],
  );

  return (
    <Button
      ref={ref}
      {...props}
      isLoading={isPending}
      disabled={disabled || isPending}
      onClick={handleClick}
    />
  );
});
