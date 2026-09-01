import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toUserMessage } from '@/lib/supabase/errors';
import {
  createCompanyWithOwner, readPendingCompanyName,
} from '@/modules/company/api/companyApi';
import { AuthLayout } from '../components/AuthLayout';

/**
 * The state after signing in with an account that has no active membership.
 *
 * Two different people land here. Someone invited to an existing company,
 * whose membership an owner has yet to activate. And a new owner who signed up
 * while the project required email confirmation: their account exists but the
 * company could not be created at sign-up, because that write needs a session
 * and confirmation had not happened yet. The second case is completed here.
 */
export function NoCompanyPage() {
  const t = useTranslate();
  const { user, signOut, refresh } = useAuth();
  const { notify } = useToast();

  // Pre-filled from what they typed at sign-up, so nothing is retyped.
  const [companyName, setCompanyName] = useState(readPendingCompanyName());
  const [isCreating, setIsCreating] = useState(false);

  /** Creates the company and makes this user its owner. */
  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    try {
      await createCompanyWithOwner(companyName, user?.full_name ?? '');
      await refresh();
      notify(t('common.saved'), 'success');
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AuthLayout title={t('app.name')} subtitle={t('auth.noMembership')}>
      <form onSubmit={onCreate} className="flex flex-col gap-4">
        <Input
          label={t('auth.companyNameLabel')}
          hint={t('auth.createCompanyHint')}
          required
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
        />
        <Button type="submit" fullWidth size="lg" isLoading={isCreating}>
          {t('auth.signUp')}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
        <Button variant="secondary" fullWidth onClick={() => void refresh()}>
          {t('common.retry')}
        </Button>
        <Button variant="ghost" fullWidth onClick={() => void signOut()}>
          {t('auth.signOut')}
        </Button>
      </div>
    </AuthLayout>
  );
}
