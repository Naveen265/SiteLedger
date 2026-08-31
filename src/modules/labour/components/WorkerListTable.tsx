import { useMemo, useState } from 'react';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatPaise } from '@/lib/format/currency';
import { WORKER_CATEGORIES } from '@/types/enums';
import type { Worker } from '@/types/domain';
import { WorkerFormDialog } from './WorkerFormDialog';

/** The worker master list, searchable by name and filterable by category. */
export function WorkerListTable({
  workers, isLoading, isError, onRetry, emptyAction,
}: {
  workers: Worker[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyAction?: React.ReactNode;
}) {
  const t = useTranslate();
  const [editing, setEditing] = useState<Worker | null>(null);

  const table = useTableState({
    rows: workers,
    searchFields: [(worker) => worker.full_name, (worker) => worker.phone],
    initialSortKey: 'name',
    comparators: {
      name: (a, b) => a.full_name.localeCompare(b.full_name),
      rate: (a, b) => a.daily_rate_paise - b.daily_rate_paise,
    },
  });

  const rows = useMemo(() => {
    const category = table.filters.category ?? 'all';
    return table.rows.filter((worker) => category === 'all' || worker.category === category);
  }, [table.rows, table.filters]);

  const columns = useMemo<Column<Worker>[]>(
    () => [
      { key: 'name', header: t('common.name'), sortable: true, render: (w) => w.full_name },
      { key: 'category', header: t('labour.workerCategory'), render: (w) => w.category },
      {
        key: 'contractor', header: t('labour.contractor'), hideOnMobile: true,
        render: (w) => w.contractor?.name ?? '-',
      },
      { key: 'phone', header: t('common.phone'), hideOnMobile: true, render: (w) => w.phone ?? '-' },
      {
        key: 'rate', header: t('labour.dailyRate'), align: 'right', sortable: true,
        render: (w) => formatPaise(w.daily_rate_paise),
      },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        search={table.search}
        onSearchChange={table.setSearch}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clearFilters}
      >
        <FilterSelect
          label={t('labour.workerCategory')}
          value={table.filters.category ?? 'all'}
          onChange={(value) => table.setFilter('category', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...WORKER_CATEGORIES.map((category) => ({ value: category, label: category })),
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(worker) => worker.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        onRowClick={setEditing}
        emptyMessage={t('labour.emptyWorkers')}
        emptyAction={emptyAction}
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <WorkerFormDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        worker={editing ?? undefined}
      />
    </div>
  );
}
