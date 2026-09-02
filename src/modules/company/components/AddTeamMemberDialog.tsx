import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { useCompany } from '@/contexts/CompanyContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { ROLES, SITE_LEVELS, type Role, type SiteLevel } from '@/types/enums';
import { isValidUsername } from '@/lib/auth/teamCredentials';
import { roleLabelKey } from '@/lib/auth/permissions';
import { useCreateTeamMember } from '../hooks/useTeam';

/**
 * Creates a login for an employee.
 *
 * The owner sets the first password and hands it over in person, which is how
 * this works for site staff who have no email address. The employee is forced
 * to choose their own password the first time they sign in.
 */
export function AddTeamMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslate();
  const { company } = useCompany();
  const { activeProjects } = useProject();
  const { notify } = useToast();
  const create = useCreateTeamMember();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('site');
  const [siteLevel, setSiteLevel] = useState<SiteLevel>('supervisor');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  // Shown after creation so the owner can copy the details before closing.
  const [created, setCreated] = useState<{ code: string; username: string } | null>(null);

  const usernameError =
    username.length > 0 && !isValidUsername(username) ? t('team.usernameHint') : undefined;
  const canSubmit =
    fullName.trim().length > 0 && isValidUsername(username) && password.length >= 8;

  /** Creates the account, then shows the credentials to hand over. */
  const submit = async () => {
    if (!canSubmit) return;
    const result = await create.mutateAsync({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      password,
      role,
      site_level: role === 'site' ? siteLevel : null,
      project_ids: projectIds,
    });
    setCreated({ code: result.company_code, username: result.username });
  };

  /** Resets the form so the dialog is clean the next time it opens. */
  const closeAndReset = () => {
    setFullName(''); setUsername(''); setPassword('');
    setRole('site'); setSiteLevel('supervisor'); setProjectIds([]); setCreated(null);
    onClose();
  };

  /** Puts the sign-in details on the clipboard in one piece. */
  const copyDetails = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(
      `${t('auth.companyCodeLabel')}: ${created.code}\n` +
        `${t('auth.usernameLabel')}: ${created.username}\n` +
        `${t('auth.passwordLabel')}: ${password}`,
    );
    notify(t('common.saved'), 'success');
  };

  if (!company?.code) {
    return (
      <Dialog open={open} onClose={closeAndReset} title={t('team.addMember')} size="sm">
        <p className="measure text-xs text-ink-muted">{t('team.noCode')}</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={closeAndReset}
      title={t('team.addMember')}
      footer={
        created ? (
          <Button onClick={closeAndReset}>{t('common.close')}</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={closeAndReset}>{t('common.cancel')}</Button>
            <AsyncButton disabled={!canSubmit} onClick={submit}>{t('common.create')}</AsyncButton>
          </>
        )
      }
    >
      {created ? (
        <div className="flex flex-col gap-3">
          <p className="measure text-xs text-ink-muted">{t('team.created')}</p>
          <dl className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t('auth.companyCodeLabel')}</dt>
              <dd className="font-mono font-semibold text-ink">{created.code}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t('auth.usernameLabel')}</dt>
              <dd className="font-mono font-semibold text-ink">{created.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{t('auth.passwordLabel')}</dt>
              <dd className="font-mono font-semibold text-ink">{password}</dd>
            </div>
          </dl>
          <AsyncButton
            variant="secondary"
            size="sm"
            icon={<Copy className="size-3.5" />}
            onClick={copyDetails}
          >
            {t('team.copyDetails')}
          </AsyncButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('common.name')}
            required
            wrapperClassName="sm:col-span-2"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Input
            label={t('auth.usernameLabel')}
            required
            hint={t('team.usernameHint')}
            error={usernameError}
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            label={t('team.tempPassword')}
            required
            minLength={8}
            hint={t('team.tempPasswordHint')}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Select
            label={t('team.roleLabel')}
            options={ROLES.map((value) => ({ value, label: t(roleLabelKey(value)) }))}
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          />
          {role === 'site' && (
            <Select
              label={t('team.levelLabel')}
              options={SITE_LEVELS.map((value) => ({ value, label: t(`roles.site_${value}`) }))}
              value={siteLevel}
              onChange={(event) => setSiteLevel(event.target.value as SiteLevel)}
            />
          )}

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium text-ink">{t('team.projects')}</p>
            <div className="flex flex-col gap-2">
              {activeProjects.map((project) => (
                <Checkbox
                  key={project.id}
                  label={project.name}
                  checked={projectIds.includes(project.id)}
                  onChange={(event) =>
                    setProjectIds((current) =>
                      event.target.checked
                        ? [...current, project.id]
                        : current.filter((id) => id !== project.id),
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
