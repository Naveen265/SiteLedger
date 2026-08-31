import { useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { Button } from '@/components/ui/Button';
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

/**
 * Company users and approval thresholds.
 * Thresholds live here rather than being hardcoded, because every firm draws
 * the approval line in a different place.
 */
export function CompanyUsersPage() {
  const t = useTranslate();
  const { can } = useAuth();
  const { members, thresholds, isLoading, isError } = useCompany();

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
        key: 'contact', header: t('common.email'), hideOnMobile: true,
        render: (member) => member.profile?.email ?? member.profile?.phone ?? '-',
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
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('company.usersTitle')}
        actions={
          can('company.manageUsers') && (
            <Button icon={<UserPlus className="size-4" />} disabled>
              {t('company.inviteUser')}
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
