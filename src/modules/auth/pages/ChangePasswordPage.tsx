import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toUserMessage } from '@/lib/supabase/errors';
import { completePasswordChange } from '@/modules/company/api/teamApi';
import { AuthLayout } from '../components/AuthLayout';

/**
 * Forced password change.
 *
 * Shown when an owner has issued or reset a password. Nothing else in the
 * application is reachable until it is done, so the password an owner knows
 * never stays in use.
 */
export function ChangePasswordPage() {
  const t = useTranslate();
  const { refresh, signOut } = useAuth();
  const { notify } = useToast();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const canSubmit = password.length >= 8 && password === confirmation;

  /** Sets the new password and clears the flag that forces this screen. */
  const submit = async () => {
    if (!canSubmit) return;
    try {
      await completePasswordChange(password);
      await refresh();
      notify(t('common.saved'), 'success');
    } catch (error) {
      notify(toUserMessage(error), 'error');
    }
  };

  return (
    <AuthLayout title={t('auth.changePasswordTitle')} subtitle={t('auth.changePasswordBody')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
      >
        <Input
          label={t('auth.newPassword')}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          error={tooShort ? t('auth.passwordLabel') : undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          error={mismatch ? t('auth.passwordMismatch') : undefined}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        <AsyncButton fullWidth size="lg" disabled={!canSubmit} onClick={submit}>
          {t('common.save')}
        </AsyncButton>

        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          {t('auth.signOut')}
        </Button>
      </form>
    </AuthLayout>
  );
}
