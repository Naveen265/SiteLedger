import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncButton } from './AsyncButton';

/**
 * Double submission is the failure this component exists to prevent: two
 * approvals, two purchase orders, two attendance rows. These tests are the
 * guarantee, not the comment above the component.
 */
describe('AsyncButton', () => {
  /** A promise the test controls, so the pending window can be inspected. */
  function deferred<T = void>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  }

  it('runs the action once however many times it is clicked', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    const onClick = vi.fn(() => gate.promise);

    render(<AsyncButton onClick={onClick}>Approve</AsyncButton>);
    const button = screen.getByRole('button');

    await user.click(button);
    await user.click(button);
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    gate.resolve();
  });

  it('disables itself while the action is running', async () => {
    const user = userEvent.setup();
    const gate = deferred();

    render(<AsyncButton onClick={() => gate.promise}>Approve</AsyncButton>);
    const button = screen.getByRole('button');

    await user.click(button);
    expect(button).toBeDisabled();

    gate.resolve();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('becomes clickable again once the action settles', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn(() => Promise.resolve());

    render(<AsyncButton onClick={onClick}>Approve</AsyncButton>);
    const button = screen.getByRole('button');

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('recovers when the action fails, and does not leak an unhandled rejection', async () => {
    const user = userEvent.setup();
    // The mutation hooks surface failures as toasts. If the rejection escaped
    // the handler it would also log an unhandled promise rejection on every
    // failed click, so it is absorbed here and the button simply resets.
    const onClick = vi.fn(() => Promise.reject(new Error('network')));
    const unhandled = vi.fn();
    window.addEventListener('unhandledrejection', unhandled);

    render(<AsyncButton onClick={onClick}>Approve</AsyncButton>);
    const button = screen.getByRole('button');

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(unhandled).not.toHaveBeenCalled();

    window.removeEventListener('unhandledrejection', unhandled);
  });

  it('stays usable after a failure, so a retry is possible', async () => {
    const user = userEvent.setup();
    const onClick = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);

    render(<AsyncButton onClick={onClick}>Approve</AsyncButton>);
    const button = screen.getByRole('button');

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('stays disabled when the caller disables it, regardless of pending state', async () => {
    render(<AsyncButton onClick={() => Promise.resolve()} disabled>Approve</AsyncButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('supports a synchronous action without hanging', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<AsyncButton onClick={onClick}>Save</AsyncButton>);
    const button = screen.getByRole('button');

    await user.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
