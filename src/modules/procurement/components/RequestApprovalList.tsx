import { Check, Package, X } from 'lucide-react';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { StatusChip } from '@/components/ui/StatusChip';
import { Explain } from '@/components/patterns/InfoTip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatDate } from '@/lib/format/date';
import { formatWithUnit } from '@/lib/format/number';
import type { MaterialRequest } from '@/types/domain';
import { useDecideRequest, usePendingRequests } from '@/modules/materials/hooks/useMaterials';

/**
 * The requests inbox.
 * Approving here routes the request straight to a purchase order, which is
 * why nothing on the order screen has to be typed again.
 */
export function RequestApprovalList({ projectIds }: { projectIds: string[] }) {
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = usePendingRequests(projectIds);
  const decide = useDecideRequest();

  const columns: Column<MaterialRequest>[] = [
    {
      key: 'project', header: t('common.project'), hideOnMobile: true,
      render: (request) => request.project?.name ?? '-',
    },
    {
      key: 'items', header: t('materials.items'),
      render: (request) => (
        <ul className="flex flex-col gap-0.5">
          {(request.items ?? []).map((item) => (
            <li key={item.id} className="text-xs">
              {item.material_item?.name ?? item.free_text_name}
              <span className="tabular ml-1.5 text-ink-muted">
                {formatWithUnit(item.quantity, item.unit)}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'neededBy',
      header: t('materials.neededBy'),
      explain: 'neededBy',
      render: (request) => (request.needed_by ? formatDate(request.needed_by) : '-'),
    },
    {
      key: 'status', header: t('common.status'),
      render: (request) => (
        <StatusChip
          label={t(`materials.requestStatus.${request.status}`)}
          tone={request.status === 'submitted' ? 'risk' : 'ontrack'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions', header: t('common.actions'), align: 'right',
      render: (request) =>
        request.status === 'submitted' && can('material.approve') ? (
          <div className="flex justify-end gap-2">
            <AsyncButton
              size="sm"
              variant="secondary"
              icon={<X className="size-3.5" />}
              stopPropagation
              onClick={() =>
                decide.mutateAsync({ requestId: request.id, decision: 'rejected' })
              }
            >
              {t('common.reject')}
            </AsyncButton>
            <AsyncButton
              size="sm"
              icon={<Check className="size-3.5" />}
              stopPropagation
              onClick={() =>
                decide.mutateAsync({ requestId: request.id, decision: 'approved' })
              }
            >
              {t('common.approve')}
            </AsyncButton>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-2xs text-ink-muted">
        <Package className="size-3.5" aria-hidden />
        {t('materials.requests')}
        <Explain name="neededBy" withFormula={false} />
      </p>
      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(request) => request.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t('materials.emptyRequests')}
      />
    </div>
  );
}
