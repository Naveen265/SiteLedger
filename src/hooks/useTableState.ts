import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/config/constants';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Sorting, searching, filtering and pagination for any list.
 * Every table in the product drives off this one hook, so behaviour is
 * identical everywhere and no screen reimplements pagination.
 */

export type SortDirection = 'asc' | 'desc';

export type TableStateOptions<T> = {
  rows: T[];
  /** Fields concatenated and matched against the search term. */
  searchFields?: Array<(row: T) => string | null | undefined>;
  initialSortKey?: string;
  initialSortDirection?: SortDirection;
  /** Comparators keyed by sort key, so each column decides its own ordering. */
  comparators?: Record<string, (a: T, b: T) => number>;
  pageSize?: number;
};

export function useTableState<T>({
  rows,
  searchFields = [],
  initialSortKey,
  initialSortDirection = 'asc',
  comparators = {},
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
}: TableStateOptions<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const debouncedSearch = useDebouncedValue(search);

  /** Applies the search term across the configured searchable fields. */
  const searched = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term || searchFields.length === 0) return rows;
    return rows.filter((row) =>
      searchFields.some((field) => (field(row) ?? '').toLowerCase().includes(term)),
    );
  }, [rows, debouncedSearch, searchFields]);

  /** Applies the active sort, if the column supplied a comparator. */
  const sorted = useMemo(() => {
    if (!sortKey || !comparators[sortKey]) return searched;
    const compare = comparators[sortKey];
    const ordered = [...searched].sort(compare);
    return sortDirection === 'asc' ? ordered : ordered.reverse();
  }, [searched, sortKey, sortDirection, comparators]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);

  const paged = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  /** Toggles direction when the same column is clicked twice. */
  const toggleSort = useCallback(
    (key: string) => {
      setSortKey((current) => {
        if (current === key) {
          setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
          return current;
        }
        setSortDirection('asc');
        return key;
      });
    },
    [],
  );

  /** Sets one filter value and returns to the first page. */
  const setFilter = useCallback((key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  /** Clears the search and every filter at once. */
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(1);
  }, []);

  const hasActiveFilters =
    search.trim().length > 0 || Object.values(filters).some((value) => value && value !== 'all');

  return {
    rows: paged,
    allFilteredRows: sorted,
    total,
    page: safePage,
    pageCount,
    pageSize,
    search,
    filters,
    sortKey,
    sortDirection,
    hasActiveFilters,
    setSearch: (value: string) => { setSearch(value); setPage(1); },
    setPage,
    setPageSize: (value: number) => { setPageSize(value); setPage(1); },
    setFilter,
    clearFilters,
    toggleSort,
  };
}
