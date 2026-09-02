import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from './Dialog';
import { I18nProvider } from '@/contexts/I18nContext';

/**
 * Typing in a dialog used to move focus to the close button on every
 * keystroke, which made every form in the product unusable. The cause was an
 * effect depending on an inline onClose whose identity changed each render, so
 * it re-ran and re-focused mid-typing. These tests hold that closed.
 */

/** A dialog whose parent re-renders on each keystroke, as the real ones do. */
function Harness() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(true);
  return (
    <I18nProvider>
      <Dialog
        open={open}
        // Deliberately an inline arrow: this is what every caller passes, and
        // it is what broke focus when the effect depended on it.
        onClose={() => setOpen(false)}
        title="Add team member"
      >
        <input aria-label="Name" value={value} onChange={(e) => setValue(e.target.value)} />
        <input aria-label="Username" />
      </Dialog>
    </I18nProvider>
  );
}

describe('Dialog focus behaviour', () => {
  it('keeps focus in the field while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const name = screen.getByLabelText('Name');
    await user.click(name);
    await user.type(name, 'Hars');

    expect(name).toHaveFocus();
    expect(name).toHaveValue('Hars');
  });

  it('puts the caret in the first field on open, not on the close button', async () => {
    render(<Harness />);
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
  });

  it('lets the user move to the next field and keep typing there', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByLabelText('Username'));
    await user.keyboard('ravi');

    expect(screen.getByLabelText('Username')).toHaveFocus();
    expect(screen.getByLabelText('Username')).toHaveValue('ravi');
  });

  it('still closes on Escape after the parent has re-rendered', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Name'), 'abc');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <I18nProvider>
        <Dialog open onClose={onClose} title="Test">
          <input aria-label="Field" />
        </Dialog>
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
