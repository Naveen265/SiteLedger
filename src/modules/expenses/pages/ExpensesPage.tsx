import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Download, Plus, Receipt, X } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { MetricTile } from '@/components/patterns/MetricTile';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatPaise } from '@/lib/format/currency';
import { formatDate } from '@/lib/format/date';
import { downloadCsv, toCsv } from '@/lib/utils/csv';
import { calculatePendingApprovalPaise } from '@/lib/calc/spend';
import { sumBy } from '@/lib/utils/collections';
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from '@/types/enums';
import type { Expense } from '@/types/domain';
import { useDecideExpense, useExpenses } from '../hooks/useExpenses';
import { ExpenseFormDialog } from '../components/ExpenseFormDialog';

/**
 * Expenses.
 * This screen answers where project money went. It is visibility, not
 * accounting: there is no ledger and no double entry anywhere in it.
 */
export function ExpensesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useExpenses(projectId ? [projectId] : []);
  const decide = useDecideExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const expenses = data ?? [];

  const table = useTableState({
    rows: expenses,
    searchFields: [(expense) => expense.note, (expense) => expense.submitter?.full_name],
    initialSortKey: 'date',
    initialSortDirection: 'desc',
    comparators: {
      date: (a, b) => a.spent_on.localeCompare(b.spent_on),
      amount: (a, b) => a.amount_paise - b.amount_paise,
    },
  });

  const rows = useMemo(() => {
    const status = table.filters.status ?? 'all';
    const category = table.filters.category ?? 'all';
    return table.rows.filter(
      (expense) =>
        (status === 'all' || expense.status === status) &&
        (category === 'all' || expense.category === category),
    );
  }, [table.rows, table.filters]);

  const approvedPaise = sumBy(
    expenses.filter((expense) => expense.status === 'approved'),
    (expense) => expense.amount_paise,
  );

  const columns = useMemo<Column<Expense>[]>(
    () => [
      { key: 'date', header: t('expenses.spentOn'), sortable: true, render: (e) => formatDate(e.spent_on) },
      {
        key: 'category', header: t('common.category'),
        render: (e) => t(`expenses.category.${e.category}`),
      },
      { key: 'note', header: t('common.note'), hideOnMobile: true, render: (e) => e.note ?? '-' },
      {
        key: 'submitter', header: t('dpr.reporter'), hideOnMobile: true,
        render: (e) => e.submitter?.full_name ?? '-',
      },
      {
        key: 'amount', header: t('common.amount'), align: 'right', sortable: true,
        render: (e) => formatPaise(e.amount_paise),
      },
      {
        key: 'status', header: t('common.status'),
        render: (e) => (
          <StatusChip
            label={t(`expenses.status.${e.status}`)}
            tone={e.status === 'approved' ? 'ontrack' : e.status === 'rejected' ? 'delayed' : 'risk'}
            size="sm"
          />
        ),
      },
      {
        key: 'actions', header: t('common.actions'), align: 'right',
        render: (expense) =>
          expense.status === 'submitted' && can('expense.approve') ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<X className="size-3.5" />}
                onClick={() => decide.mutate({ expenseId: expense.id, decision: 'rejected' })}
              >
                {t('common.reject')}
              </Button>
              <Button
                size="sm"
                icon={<Check className="size-3.5" />}
                onClick={() => decide.mutate({ expenseId: expense.id, decision: 'approved' })}
              >
                {t('common.approve')}
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, can, decide],
  );

  /** Exports the visible expenses in a Tally friendly column layout. */
  const exportCsv = () => {
    const csv = toCsv(rows, [
      { header: 'Date', value: (e) => e.spent_on },
      { header: 'Category', value: (e) => e.category },
      { header: 'Amount (Rs)', value: (e) => e.amount_paise / 100 },
      { header: 'Status', value: (e) => e.status },
      { header: 'Submitted by', value: (e) => e.submitter?.full_name ?? '' },
      { header: 'Note', value: (e) => e.note ?? '' },
    ]);
    downloadCsv(`expenses-${projectId}.csv`, csv);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('expenses.title')}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              onClick={exportCsv}
              disabled={rows.length === 0}
            >
              {t('reports.exportCsv')}
            </Button>
            {can('expense.submit') && (
              <Button icon={<Plus className="size-4" />} onClick={() => setIsAddOpen(true)}>
                {t('expenses.add')}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricTile
          label={t('dashboard.spendToDate')}
          value={formatPaise(approvedPaise)}
          explain="spendByCategory"
          isLoading={isLoading}
        />
        <MetricTile
          label={t('expenses.pendingApproval')}
          value={formatPaise(calculatePendingApprovalPaise(expenses))}
          tone="risk"
          isLoading={isLoading}
        />
      </div>

      <FilterBar
        search={table.search}
        onSearchChange={table.setSearch}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clearFilters}
      >
        <FilterSelect
          label={t('common.status')}
          value={table.filters.status ?? 'all'}
          onChange={(value) => table.setFilter('status', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...EXPENSE_STATUSES.map((status) => ({ value: status, label: t(`expenses.status.${status}`) })),
          ]}
        />
        <FilterSelect
          label={t('common.category')}
          value={table.filters.category ?? 'all'}
          onChange={(value) => table.setFilter('category', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...EXPENSE_CATEGORIES.map((category) => ({
              value: category, label: t(`expenses.category.${category}`),
            })),
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(expense) => expense.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        emptyMessage={t('expenses.empty')}
        emptyAction={
          can('expense.submit') && (
            <Button icon={<Receipt className="size-4" />} onClick={() => setIsAddOpen(true)}>
              {t('expenses.add')}
            </Button>
          )
        }
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <ExpenseFormDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} projectId={projectId!} />
    </div>
  );
}
