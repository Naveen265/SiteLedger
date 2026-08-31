import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { Package, Plus } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisProps, chartTheme } from '@/components/charts/theme';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatDate } from '@/lib/format/date';
import { formatQuantity } from '@/lib/format/number';
import { calculateStockOnHand, calculateTopMaterialsConsumed, type StockLine } from '@/lib/calc/materials';
import type { MaterialRequest } from '@/types/domain';
import {
  useMaterialItems, useMaterialRequests, useStockMovements,
} from '../hooks/useMaterials';
import { MaterialRequestDialog } from '../components/MaterialRequestDialog';
import { IssueStockDialog } from '../components/IssueStockDialog';
import { MaterialItemDialog } from '../components/MaterialItemDialog';

/**
 * Materials.
 * Stock is a view over the movement ledger, never a stored number, so a
 * correction to any receipt or issue is reflected here immediately.
 */
export function MaterialsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const [tab, setTab] = useState<'stock' | 'requests' | 'items'>('stock');
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isItemOpen, setIsItemOpen] = useState(false);

  const itemsQuery = useMaterialItems();
  const movementsQuery = useStockMovements(projectId ?? null);
  const requestsQuery = useMaterialRequests(projectId ?? null);

  const stock = useMemo(
    () => calculateStockOnHand(movementsQuery.data ?? [], itemsQuery.data ?? []),
    [movementsQuery.data, itemsQuery.data],
  );

  const topConsumed = useMemo(
    () => calculateTopMaterialsConsumed(movementsQuery.data ?? [], itemsQuery.data ?? []),
    [movementsQuery.data, itemsQuery.data],
  );

  const stockColumns = useMemo<Column<StockLine>[]>(
    () => [
      { key: 'name', header: t('common.name'), render: (line) => line.name },
      { key: 'received', header: t('procurement.receivedQuantity'), align: 'right', hideOnMobile: true,
        render: (line) => formatQuantity(line.received) },
      { key: 'issued', header: t('materials.issueStock'), align: 'right', hideOnMobile: true,
        render: (line) => formatQuantity(line.issued) },
      {
        key: 'onHand', header: t('materials.onHand'), align: 'right', explain: 'stockOnHand',
        render: (line) => (
          <span className="font-semibold">{formatQuantity(line.on_hand)} {line.unit}</span>
        ),
      },
      {
        key: 'low', header: t('common.status'),
        render: (line) =>
          line.is_low ? (
            <StatusChip label={t('materials.lowStock')} tone="risk" size="sm" />
          ) : (
            <StatusChip label={t('status.on_track')} tone="ontrack" size="sm" />
          ),
      },
    ],
    [t],
  );

  const requestColumns = useMemo<Column<MaterialRequest>[]>(
    () => [
      {
        key: 'items', header: t('materials.items'),
        render: (request) =>
          (request.items ?? [])
            .map((item) => item.material_item?.name ?? item.free_text_name)
            .join(', ') || '-',
      },
      {
        key: 'neededBy', header: t('materials.neededBy'), explain: 'neededBy',
        render: (request) => (request.needed_by ? formatDate(request.needed_by) : '-'),
      },
      {
        key: 'requester', header: t('dpr.reporter'), hideOnMobile: true,
        render: (request) => request.requester?.full_name ?? '-',
      },
      {
        key: 'status', header: t('common.status'),
        render: (request) => (
          <StatusChip
            label={t(`materials.requestStatus.${request.status}`)}
            tone={
              request.status === 'rejected' ? 'delayed'
              : request.status === 'submitted' ? 'risk'
              : 'ontrack'
            }
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
        title={t('materials.title')}
        actions={
          <>
            {can('material.request') && (
              <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setIsRequestOpen(true)}>
                {t('materials.newRequest')}
              </Button>
            )}
            {can('stock.issue') && (
              <Button icon={<Package className="size-4" />} onClick={() => setIsIssueOpen(true)}>
                {t('materials.issueStock')}
              </Button>
            )}
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as typeof tab)}
        items={[
          { value: 'stock', label: t('materials.stock'), count: stock.length },
          { value: 'requests', label: t('materials.requests'), count: (requestsQuery.data ?? []).length },
          { value: 'items', label: t('materials.items'), count: (itemsQuery.data ?? []).length },
        ]}
      />

      {tab === 'stock' && (
        <div className="flex flex-col gap-4">
          <DataTable
            columns={stockColumns}
            rows={stock}
            rowKey={(line) => line.material_item_id}
            isLoading={movementsQuery.isLoading}
            isError={movementsQuery.isError}
            onRetry={() => void movementsQuery.refetch()}
            emptyMessage={t('materials.emptyStock')}
          />

          <ChartCard
            chartId="stockOnHand"
            isLoading={movementsQuery.isLoading}
            isEmpty={stock.length === 0}
            emptyMessage={t('materials.emptyStock')}
          >
            <BarChart data={stock.slice(0, 12)}>
              <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} vertical={false} />
              <XAxis dataKey="name" {...axisProps} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis {...axisProps} width={40} />
              <Tooltip content={<ChartTooltip formatValue={(value) => formatQuantity(value)} />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
              <Bar dataKey="on_hand" name={t('materials.onHand')} fill={chartTheme.primary} radius={[3, 3, 0, 0]} />
              {/* The marker is the low stock threshold set on the item itself. */}
              <ReferenceLine y={0} stroke={chartTheme.border} />
            </BarChart>
          </ChartCard>

          <ChartCard
            chartId="topMaterials"
            isLoading={movementsQuery.isLoading}
            isEmpty={topConsumed.length === 0}
            emptyMessage={t('materials.emptyStock')}
          >
            <BarChart data={topConsumed} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis type="category" dataKey="name" width={110} {...axisProps} />
              <Tooltip content={<ChartTooltip formatValue={(value) => formatQuantity(value)} />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
              <Bar dataKey="quantity" name={t('common.quantity')} fill={chartTheme.ontrack} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {tab === 'requests' && (
        <DataTable
          columns={requestColumns}
          rows={requestsQuery.data ?? []}
          rowKey={(request) => request.id}
          isLoading={requestsQuery.isLoading}
          isError={requestsQuery.isError}
          onRetry={() => void requestsQuery.refetch()}
          emptyMessage={t('materials.emptyRequests')}
          emptyAction={
            can('material.request') && (
              <Button icon={<Plus className="size-4" />} onClick={() => setIsRequestOpen(true)}>
                {t('materials.newRequest')}
              </Button>
            )
          }
        />
      )}

      {tab === 'items' && (
        <DataTable
          columns={[
            { key: 'name', header: t('common.name'), render: (item) => item.name },
            { key: 'unit', header: t('common.unit'), render: (item) => item.unit },
            { key: 'category', header: t('common.category'), hideOnMobile: true, render: (item) => item.category ?? '-' },
            {
              key: 'threshold', header: t('materials.threshold'), align: 'right',
              render: (item) => (item.low_stock_threshold !== null ? formatQuantity(item.low_stock_threshold) : '-'),
            },
          ]}
          rows={itemsQuery.data ?? []}
          rowKey={(item) => item.id}
          isLoading={itemsQuery.isLoading}
          emptyMessage={t('materials.emptyItems')}
          emptyAction={
            <Button icon={<Plus className="size-4" />} onClick={() => setIsItemOpen(true)}>
              {t('materials.addItem')}
            </Button>
          }
        />
      )}

      <MaterialRequestDialog open={isRequestOpen} onClose={() => setIsRequestOpen(false)} projectId={projectId!} />
      <IssueStockDialog open={isIssueOpen} onClose={() => setIsIssueOpen(false)} projectId={projectId!} stock={stock} />
      <MaterialItemDialog open={isItemOpen} onClose={() => setIsItemOpen(false)} />
    </div>
  );
}
