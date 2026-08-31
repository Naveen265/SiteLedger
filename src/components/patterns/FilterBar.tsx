import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { useTranslate } from '@/contexts/I18nContext';

/**
 * The search and filter strip that sits above every list.
 * Filters are passed in as children so each screen decides which ones it
 * needs, while search, clearing and layout stay identical everywhere.
 */
export function FilterBar({
  search, onSearchChange, searchPlaceholder, hasActiveFilters, onClear, children, actions, className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  hasActiveFilters?: boolean;
  onClear?: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslate();

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          type="search"
          value={search}
          aria-label={t('common.search')}
          placeholder={searchPlaceholder ?? t('common.searchPlaceholder')}
          onChange={(event) => onSearchChange(event.target.value)}
          className={cn(
            'h-9 w-full rounded-[var(--radius-control)] border border-border bg-surface',
            'pl-8 pr-3 text-xs text-ink placeholder:text-ink-faint',
            'focus:border-primary',
          )}
        />
      </div>

      {children}

      {hasActiveFilters && onClear && (
        <Button variant="ghost" size="sm" icon={<X className="size-3.5" />} onClick={onClear}>
          {t('common.clear')}
        </Button>
      )}

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A compact dropdown filter matching the height of the search box. */
export function FilterSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-9 rounded-[var(--radius-control)] border border-border bg-surface px-2.5 text-xs text-ink',
        'focus:border-primary',
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
