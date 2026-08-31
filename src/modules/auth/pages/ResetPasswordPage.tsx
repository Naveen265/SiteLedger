import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/supabase/errors';
import { routes } from '@/config/routes';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthLayout } from '../components/AuthLayout';

/** Completes a password reset, using the recovery session from the email link. */
export function ResetPasswordPage() {
  const t = useTranslate();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /** Sets the new password on the recovered session. */
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      notify(t('common.saved'), 'success');
      navigate(routes.projects);
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthLayout title={t('auth.resetPassword')}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t('auth.passwordLabel')}
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" fullWidth size="lg" isLoading={isSaving}>
          {t('common.save')}
        </Button>
      </form>
    </AuthLayout>
  );
}
