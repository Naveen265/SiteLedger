import { cn } from '@/lib/utils/cn';

/**
 * The tooltip shared by every chart.
 * Values are formatted by the chart that owns them, because only that chart
 * knows whether the number is money, a quantity or a day count.
 */

export type ChartTooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

export function ChartTooltip({
  active, payload, label, formatValue, className,
}: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
  /** Formats one value, given the series key it belongs to. */
  formatValue?: (value: number, key: string) => string;
  className?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-control)] border border-border bg-surface px-2.5 py-2',
        'shadow-[var(--shadow-overlay)]',
        className,
      )}
    >
      {label !== undefined && (
        <p className="mb-1 text-2xs font-medium text-ink">{String(label)}</p>
      )}
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="flex items-center gap-1.5 text-2xs text-ink-muted">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          <span>{entry.name}</span>
          <span className="tabular ml-auto pl-3 font-medium text-ink">
            {formatValue
              ? formatValue(Number(entry.value ?? 0), String(entry.dataKey))
              : String(entry.value ?? '')}
          </span>
        </p>
      ))}
    </div>
  );
}
