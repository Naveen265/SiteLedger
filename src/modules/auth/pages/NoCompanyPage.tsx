import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { Button } from '@/components/ui/Button';
import { AuthLayout } from '../components/AuthLayout';

/**
 * The state after signing in with an account that has no active membership.
 * This happens between an invite being sent and an owner activating it, and it
 * needs its own screen rather than an empty dashboard.
 */
export function NoCompanyPage() {
  const t = useTranslate();
  const { signOut, refresh } = useAuth();

  return (
    <AuthLayout title={t('app.name')} subtitle={t('auth.noMembership')}>
      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={() => void refresh()}>{t('common.retry')}</Button>
        <Button fullWidth variant="secondary" onClick={() => void signOut()}>
          {t('auth.signOut')}
        </Button>
      </div>
    </AuthLayout>
  );
}
