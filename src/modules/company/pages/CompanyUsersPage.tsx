import { useMemo, useState } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { StatusChip } from '@/components/ui/StatusChip';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatPaise } from '@/lib/format/currency';
import { roleLabelKey } from '@/lib/auth/permissions';
import { APPROVAL_KINDS } from '@/types/enums';
import type { CompanyMember } from '@/types/domain';
import { AddTeamMemberDialog } from '../components/AddTeamMemberDialog';
import { useResetTeamPassword, useSetTeamMemberStatus } from '../hooks/useTeam';

/**
 * Company users and approval thresholds.
 * Thresholds live here rather than being hardcoded, because every firm draws
 * the approval line in a different place.
 */
export function CompanyUsersPage() {
  const t = useTranslate();
  const { can, user } = useAuth();
  const { members, thresholds, company, isLoading, isError } = useCompany();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const resetPassword = useResetTeamPassword();
  const setStatus = useSetTeamMemberStatus();

  /**
   * Owners are the recovery path for staff, who have no email to reset
   * against. The new password is typed here and handed over in person.
   */
  const onResetPassword = async (member: CompanyMember) => {
    const next = window.prompt(
      `${t('team.resetPassword')} — ${member.profile?.full_name ?? ''}\n${t('team.tempPasswordHint')}`,
    );
    if (!next) return;
    await resetPassword.mutateAsync({ profileId: member.profile_id, password: next });
  };

  const columns = useMemo<Column<CompanyMember>[]>(
    () => [
      {
        key: 'name', header: t('common.name'),
        render: (member) => member.profile?.full_name ?? '-',
      },
      {
        key: 'role', header: t('profile.yourRole'),
        render: (member) => t(roleLabelKey(member.role, member.site_level)),
      },
      {
        key: 'username', header: t('auth.usernameLabel'),
        // Staff sign in with this; owners who signed up themselves use email.
        render: (member) =>
          member.username
            ? <code className="text-2xs">{member.username}</code>
            : (member.profile?.email ?? '-'),
      },
      {
        key: 'status', header: t('common.status'),
        render: (member) => (
          <StatusChip
            label={member.status}
            tone={member.status === 'active' ? 'ontrack' : member.status === 'invited' ? 'risk' : 'neutral'}
            size="sm"
          />
        ),
      },
      {
        key: 'actions', header: t('common.actions'), align: 'right',
        render: (member) =>
          can('company.manageUsers') && member.profile_id !== user?.id ? (
            <div className="flex justify-end gap-2">
              <AsyncButton
                size="sm"
                variant="secondary"
                icon={<KeyRound className="size-3.5" />}
                onClick={() => onResetPassword(member)}
              >
                {t('team.resetPassword')}
              </AsyncButton>
              <AsyncButton
                size="sm"
                variant="ghost"
                onClick={() =>
                  setStatus.mutateAsync({
                    profileId: member.profile_id,
                    status: member.status === 'active' ? 'disabled' : 'active',
                  })
                }
              >
                {member.status === 'active' ? t('team.deactivate') : t('team.reactivate')}
              </AsyncButton>
            </div>
          ) : null,
      },
    ],
    // onResetPassword and the mutations are stable for the table's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, can, user?.id],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('company.usersTitle')}
        actions={
          can('company.manageUsers') && (
            <Button icon={<UserPlus className="size-4" />} onClick={() => setIsAddOpen(true)}>
              {t('team.addMember')}
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        rows={members}
        rowKey={(member) => member.id}
        isLoading={isLoading}
        isError={isError}
        emptyMessage={t('company.emptyUsers')}
      />

      {company?.code && (
        <p className="text-2xs text-ink-muted">
          {t('auth.companyCodeLabel')}:{' '}
          <code className="font-mono font-semibold text-ink">{company.code}</code>
          {' — '}{t('auth.signInStaffHint')}
        </p>
      )}

      <AddTeamMemberDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} />

      <Card className="max-w-xl">
        <CardHeader title={t('company.thresholds')} subtitle={t('company.thresholdHelp')} />
        <div className="flex flex-col gap-4 p-4">
          {APPROVAL_KINDS.map((kind) => {
            const threshold = thresholds.find((row) => row.kind === kind);
            return (
              <Input
                key={kind}
                label={kind === 'expense' ? t('expenses.title') : t('procurement.purchaseOrders')}
                type="number"
                readOnly
                value={threshold ? threshold.amount_paise / 100 : 0}
                hint={threshold ? formatPaise(threshold.amount_paise) : t('common.none')}
              />
            );
          })}
        </div>
      </Card>
    </div>
  );
}
