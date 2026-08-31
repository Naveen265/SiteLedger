import { NUMBER_LOCALE, PAISE_PER_RUPEE } from '@/config/constants';

/**
 * Currency formatting. All money is stored as integer paise and only ever
 * becomes a rupee string here, so rounding happens in exactly one place.
 */

const rupeeFormatter = new Intl.NumberFormat(NUMBER_LOCALE, {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const rupeePreciseFormatter = new Intl.NumberFormat(NUMBER_LOCALE, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats paise as whole rupees, for example 12000000 becomes "Rs 1,20,000". */
export function formatPaise(paise: number | null | undefined): string {
  return rupeeFormatter.format((paise ?? 0) / PAISE_PER_RUPEE);
}

/** Formats paise with two decimals, used only where the exact figure matters. */
export function formatPaisePrecise(paise: number | null | undefined): string {
  return rupeePreciseFormatter.format((paise ?? 0) / PAISE_PER_RUPEE);
}

/** Converts a rupee value typed by a user into integer paise for storage. */
export function rupeesToPaise(rupees: number | string): number {
  const value = typeof rupees === 'string' ? Number.parseFloat(rupees) : rupees;
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * PAISE_PER_RUPEE);
}

/** Converts stored paise back into rupees for a form field. */
export function paiseToRupees(paise: number | null | undefined): number {
  return (paise ?? 0) / PAISE_PER_RUPEE;
}

/** Compact form for chart axes, where a full rupee string would not fit. */
export function formatPaiseCompact(paise: number | null | undefined): string {
  const rupees = (paise ?? 0) / PAISE_PER_RUPEE;
  if (Math.abs(rupees) >= 10_000_000) return `${(rupees / 10_000_000).toFixed(1)} Cr`;
  if (Math.abs(rupees) >= 100_000) return `${(rupees / 100_000).toFixed(1)} L`;
  if (Math.abs(rupees) >= 1_000) return `${(rupees / 1_000).toFixed(1)} K`;
  return String(Math.round(rupees));
}
