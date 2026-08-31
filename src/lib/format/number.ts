import { NUMBER_LOCALE } from '@/config/constants';

/** Number formatting, always with Indian digit grouping. */

const decimalFormatter = new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat(NUMBER_LOCALE, { maximumFractionDigits: 0 });

/** Formats a quantity, keeping up to two decimals for part units. */
export function formatQuantity(value: number | null | undefined): string {
  return decimalFormatter.format(value ?? 0);
}

/** Formats a whole number such as a headcount or a day count. */
export function formatCount(value: number | null | undefined): string {
  return integerFormatter.format(value ?? 0);
}

/** Formats a percentage for display, for example 42 becomes "42%". */
export function formatPercent(value: number | null | undefined): string {
  return `${Math.round(value ?? 0)}%`;
}

/** Formats a quantity together with its unit, for example "12 bag". */
export function formatWithUnit(value: number | null | undefined, unit: string): string {
  return `${formatQuantity(value)} ${unit}`;
}
