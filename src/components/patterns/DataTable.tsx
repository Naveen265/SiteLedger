import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTranslate } from '@/contexts/I18nContext';
import { PAGE_SIZE_OPTIONS } from '@/config/constants';
import { Explain } from './InfoTip';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

/**
 * The one table in the product.
 * Sorting, pagination, loading skeletons, empty and error states all live here
 * so no screen reimplements them and every list behaves identically.
 */

export type Column<T> = {
  key: string;
  header: string;
  /** Cell renderer. Receives the row and its index in the current page. */
  render: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  /** Name of an explain entry, required when the column value is calculated. */
  explain?: string;
  align?: 'left' | 'right';
  /** Hidden below the desktop breakpoint, for columns that do not fit a phone. */
  hideOnMobile?: boolean;
  width?: string;
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Pagination, supplied by useTableState. Omit to render an unpaged table. */
  pagination?: {
    page: number;
    pageCount: number;
    pageSize: number;
    total: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  className?: string;
};

export function DataTable<T>({
  columns, rows, rowKey, isLoading, isError, onRetry, emptyMessage, emptyAction,
  onRowClick, pagination, sortKey, sortDirection, onSort, className,
}: DataTableProps<T>) {
  const t = useTranslate();

  if (isError) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-surface">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface', className)}>
      {/* Wide tables scroll inside their own container, the page never does. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-subtle">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'px-3 py-2.5 text-2xs font-semibold text-ink-muted',
                    column.align === 'right' && 'text-right',
                    column.hideOnMobile && 'hidden lg:table-cell',
                  )}
                >
                  <span className={cn('inline-flex items-center gap-1', column.align === 'right' && 'flex-row-reverse')}>
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        {column.header}
                        {sortKey === column.key &&
                          (sortDirection === 'asc'
                            ? <ArrowUp className="size-3" aria-hidden />
                            : <ArrowDown className="size-3" aria-hidden />)}
                      </button>
                    ) : (
                      column.header
                    )}
                    {column.explain && <Explain name={column.explain} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              // Skeleton rows keep the layout stable while the data arrives.
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-0">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-3 py-3', column.hideOnMobile && 'hidden lg:table-cell')}
                    >
                      <Skeleton className="h-3.5 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState message={emptyMessage} action={emptyAction} />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => { if (event.key === 'Enter') onRowClick(row); }
                      : undefined
                  }
                  className={cn(
                    'border-b border-border last:border-0',
                    // Zebra striping uses the page background, not a new colour.
                    index % 2 === 1 && 'bg-surface-subtle/50',
                    onRowClick && 'cursor-pointer hover:bg-primary-subtle',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 py-3 align-middle text-xs text-ink',
                        column.align === 'right' && 'text-right tabular',
                        column.hideOnMobile && 'hidden lg:table-cell',
                      )}
                    >
                      {column.render(row, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !isLoading && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
          <p className="tabular text-2xs text-ink-muted">
            {t('common.showing')} {(pagination.page - 1) * pagination.pageSize + 1}
            {' to '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            {' '}{t('common.of')} {pagination.total} {t('common.results')}
          </p>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-2xs text-ink-muted">
              {t('common.rowsPerPage')}
              <select
                value={pagination.pageSize}
                onChange={(event) => pagination.setPageSize(Number(event.target.value))}
                className="h-7 rounded-[var(--radius-control)] border border-border bg-surface px-1.5 text-2xs"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>

            <IconButton
              label={t('common.previous')}
              icon={<ChevronLeft className="size-4" />}
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.setPage(pagination.page - 1)}
            />
            <span className="tabular text-2xs text-ink-muted">
              {pagination.page} {t('common.of')} {pagination.pageCount}
            </span>
            <IconButton
              label={t('common.next')}
              icon={<ChevronRight className="size-4" />}
              size="sm"
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => pagination.setPage(pagination.page + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Re-exported so screens can build a "create the first one" empty action. */
export { Button as DataTableAction };
