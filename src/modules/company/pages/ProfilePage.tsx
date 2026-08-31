import { PageHeader } from '@/components/patterns/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslate } from '@/contexts/I18nContext';
import { roleLabelKey } from '@/lib/auth/permissions';
import { LanguagePicker } from '@/modules/auth/components/LanguagePicker';

/** The user's own profile: identity, role and the language switch. */
export function ProfilePage() {
  const t = useTranslate();
  const { user, signOut } = useAuth();
  const { company } = useCompany();

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t('profile.title')} />

      <Card className="max-w-lg">
        <div className="flex items-center gap-3 p-4">
          <Avatar name={user.full_name} src={user.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.full_name}</p>
            <p className="truncate text-2xs text-ink-muted">
              {user.email ?? user.phone ?? ''}
            </p>
          </div>
        </div>

        <dl className="divide-y divide-border border-t border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-xs text-ink-muted">{t('profile.yourRole')}</dt>
            <dd className="text-xs font-medium text-ink">
              {t(roleLabelKey(user.role, user.site_level))}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-xs text-ink-muted">{t('auth.companyNameLabel')}</dt>
            <dd className="text-xs font-medium text-ink">{company?.name ?? '-'}</dd>
          </div>
        </dl>
      </Card>

      <Card className="max-w-lg">
        <CardHeader title={t('profile.language')} subtitle={t('profile.languageHelp')} />
        <div className="p-4">
          <LanguagePicker />
        </div>
      </Card>

      <Button variant="secondary" className="max-w-lg" onClick={() => void signOut()}>
        {t('auth.signOut')}
      </Button>
    </div>
  );
}
