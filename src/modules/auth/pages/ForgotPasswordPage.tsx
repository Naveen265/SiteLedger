import { useState } from 'react';
import { Link } from 'react-router-dom';
import { routes } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toUserMessage } from '@/lib/supabase/errors';
import { AuthLayout } from '../components/AuthLayout';

/** Sends a link that lets the user set a new password. */
export function ForgotPasswordPage() {
  const t = useTranslate();
  const { requestPasswordReset } = useAuth();
  const { notify } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [wasSent, setWasSent] = useState(false);

  /** Requests the reset and reports the outcome in place. */
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    try {
      await requestPasswordReset(identifier);
      setWasSent(true);
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.resetPassword')}
      footer={
        <Link to={routes.signIn} className="font-medium text-primary underline underline-offset-2">
          {t('auth.signIn')}
        </Link>
      }
    >
      {wasSent ? (
        <p className="measure text-xs text-ink-muted">{t('auth.resetSent')}</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label={t('auth.emailLabel')}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <Button type="submit" fullWidth size="lg" isLoading={isSending}>
            {t('auth.resetPassword')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
