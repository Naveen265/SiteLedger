import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus, Wrench } from 'lucide-react';
import { subDays } from 'date-fns';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisProps, chartTheme } from '@/components/charts/theme';
import { Button } from '@/components/ui/Button';
import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatDate } from '@/lib/format/date';
import { formatCount } from '@/lib/format/number';
import {
  calculateCurrentIdleDays, calculateRentalDaysRemaining,
} from '@/lib/calc/equipment';
import { ASSET_OWNERSHIPS, ASSET_STATUSES, ASSET_TYPES } from '@/types/enums';
import type { Asset } from '@/types/domain';
import { useAssets } from '../hooks/useEquipment';
import { AssetFormDialog } from '../components/AssetFormDialog';
import { AssetDetailDialog } from '../components/AssetDetailDialog';

/** Maps an asset status to its chip tone. */
const STATUS_TONE: Record<string, StatusTone> = {
  in_use: 'ontrack',
  idle: 'idle',
  under_repair: 'risk',
  returned: 'neutral',
};

/**
 * The asset register.
 * This is the module the product is positioned on. Owned machines and reusable
 * formwork sets that move between sites, sit idle and get lost are a real and
 * expensive blind spot, and this screen is the answer to it.
 */
export function EquipmentPage() {
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useAssets();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openAssetId, setOpenAssetId] = useState<string | null>(null);

  const assets = data ?? [];

  const table = useTableState({
    rows: assets,
    searchFields: [(asset) => asset.name, (asset) => asset.identifier],
    initialSortKey: 'name',
    comparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      idle: (a, b) => calculateCurrentIdleDays(a, []) - calculateCurrentIdleDays(b, []),
    },
  });

  const rows = useMemo(() => {
    const type = table.filters.type ?? 'all';
    const status = table.filters.status ?? 'all';
    const ownership = table.filters.ownership ?? 'all';
    return table.rows.filter(
      (asset) =>
        (type === 'all' || asset.asset_type === type) &&
        (status === 'all' || asset.status === status) &&
        (ownership === 'all' || asset.ownership === ownership),
    );
  }, [table.rows, table.filters]);

  // Utilisation is derived from the movement log, never from a stored counter.
  const utilisationData = useMemo(
    () =>
      assets.slice(0, 10).map((asset) => {
        const idle = calculateCurrentIdleDays(asset, []);
        const periodDays = 30;
        return {
          name: asset.name,
          in_use: asset.status === 'in_use' ? Math.max(0, periodDays - idle) : 0,
          idle,
        };
      }),
    [assets],
  );

  const columns = useMemo<Column<Asset>[]>(
    () => [
      {
        key: 'name', header: t('common.name'), sortable: true,
        render: (asset) => (
          <div>
            <p className="font-medium text-ink">{asset.name}</p>
            <p className="text-2xs text-ink-muted">
              {t(`equipment.type.${asset.asset_type}`)}
              {asset.set_quantity ? ` · ${formatCount(asset.set_quantity)}` : ''}
              {asset.identifier ? ` · ${asset.identifier}` : ''}
            </p>
          </div>
        ),
      },
      {
        key: 'ownership', header: t('equipment.ownership'), hideOnMobile: true,
        render: (asset) => t(`equipment.own.${asset.ownership}`),
      },
      {
        key: 'site', header: t('equipment.currentSite'),
        render: (asset) => asset.current_project?.name ?? '-',
      },
      {
        key: 'status', header: t('common.status'),
        render: (asset) => (
          <StatusChip
            label={t(`equipment.status.${asset.status}`)}
            tone={STATUS_TONE[asset.status]}
            size="sm"
          />
        ),
      },
      {
        key: 'idle', header: t('equipment.idleDays'), align: 'right', sortable: true, explain: 'idleDays',
        render: (asset) => {
          const idleDays = calculateCurrentIdleDays(asset, []);
          return (
            <span className={idleDays > asset.idle_threshold_days ? 'font-semibold text-status-risk' : ''}>
              {formatCount(idleDays)}
            </span>
          );
        },
      },
      {
        key: 'rental', header: t('equipment.rentalDue'), align: 'right', hideOnMobile: true,
        render: (asset) => {
          if (asset.ownership !== 'rented' || !asset.rental_due_date) return '-';
          const remaining = calculateRentalDaysRemaining(asset);
          return (
            <span className={remaining !== null && remaining < 0 ? 'font-semibold text-status-delayed' : ''}>
              {formatDate(asset.rental_due_date)}
            </span>
          );
        },
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('equipment.register')}
        actions={
          can('asset.manage') && (
            <Button icon={<Plus className="size-4" />} onClick={() => setIsCreateOpen(true)}>
              {t('equipment.addAsset')}
            </Button>
          )
        }
      />

      <FilterBar
        search={table.search}
        onSearchChange={table.setSearch}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clearFilters}
      >
        <FilterSelect
          label={t('equipment.assetType')}
          value={table.filters.type ?? 'all'}
          onChange={(value) => table.setFilter('type', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...ASSET_TYPES.map((type) => ({ value: type, label: t(`equipment.type.${type}`) })),
          ]}
        />
        <FilterSelect
          label={t('common.status')}
          value={table.filters.status ?? 'all'}
          onChange={(value) => table.setFilter('status', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...ASSET_STATUSES.map((status) => ({ value: status, label: t(`equipment.status.${status}`) })),
          ]}
        />
        <FilterSelect
          label={t('equipment.ownership')}
          value={table.filters.ownership ?? 'all'}
          onChange={(value) => table.setFilter('ownership', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...ASSET_OWNERSHIPS.map((own) => ({ value: own, label: t(`equipment.own.${own}`) })),
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(asset) => asset.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onRowClick={(asset) => setOpenAssetId(asset.id)}
        emptyMessage={t('equipment.empty')}
        emptyAction={
          can('asset.manage') && (
            <Button icon={<Wrench className="size-4" />} onClick={() => setIsCreateOpen(true)}>
              {t('equipment.addAsset')}
            </Button>
          )
        }
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <ChartCard
        chartId="equipmentUtilisation"
        isLoading={isLoading}
        isEmpty={utilisationData.length === 0}
        emptyMessage={t('equipment.empty')}
      >
        <BarChart data={utilisationData}>
          <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} vertical={false} />
          <XAxis dataKey="name" {...axisProps} interval={0} angle={-20} textAnchor="end" height={64} />
          <YAxis {...axisProps} width={36} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="in_use" name={t('equipment.daysInUse')} fill={chartTheme.ontrack} radius={[3, 3, 0, 0]} />
          <Bar dataKey="idle" name={t('equipment.idleDays')} fill={chartTheme.idle} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ChartCard>

      <AssetFormDialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <AssetDetailDialog assetId={openAssetId} onClose={() => setOpenAssetId(null)} />

      {/* Period note: the utilisation chart above covers the last 30 days. */}
      <p className="text-2xs text-ink-faint">
        {t('common.period')}: {formatDate(subDays(new Date(), 30))} {t('common.to')} {formatDate(new Date())}
      </p>
    </div>
  );
}
