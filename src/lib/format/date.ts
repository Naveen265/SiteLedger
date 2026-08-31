import { format, formatDistanceToNowStrict, parseISO, differenceInCalendarDays } from 'date-fns';
import { DISPLAY_TIME_ZONE } from '@/config/constants';

/**
 * Date formatting. The database stores UTC timestamps; the interface always
 * shows Asia/Kolkata in dd MMM yyyy. Nothing in the product shows MM/DD/YYYY.
 */

/** Accepts either an ISO string or a Date and returns a Date. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Renders a date as "31 Aug 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'dd MMM yyyy') : '';
}

/** Renders a timestamp as "31 Aug 2026, 14:05" in the display time zone. */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: DISPLAY_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `${formatDate(date)}, ${time}`;
}

/** Renders a short relative age such as "3 days" for ageing displays. */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? formatDistanceToNowStrict(date) : '';
}

/** Whole calendar days between two dates, ignoring the time of day. */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const a = toDate(from);
  const b = toDate(to);
  if (!a || !b) return 0;
  return differenceInCalendarDays(b, a);
}

/** Today as an ISO date string, which is the shape every date column expects. */
export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Converts a Date to the ISO date string used by date columns and inputs. */
export function toIsoDate(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}
