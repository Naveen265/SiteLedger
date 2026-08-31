/**
 * Product-wide constants. Anything a consumer might reasonably want to tune
 * lives here rather than being sprinkled through component files.
 */

/** All money is stored in paise as integers, and only formatted at the edge. */
export const PAISE_PER_RUPEE = 100;

/** Every date the database stores is UTC; every date shown is Asia/Kolkata. */
export const DISPLAY_TIME_ZONE = 'Asia/Kolkata';

/** Number and currency grouping always follows Indian convention. */
export const NUMBER_LOCALE = 'en-IN';

/** Images are compressed client side before upload so uploads survive 3G. */
export const IMAGE_UPLOAD = {
  maxWidthOrHeight: 1600,
  quality: 0.7,
  maxSizeMB: 0.3,
} as const;

/** Lists longer than this are paginated rather than rendered whole. */
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100];

/** An asset sitting with no site allocation for longer than this raises an alert. */
export const DEFAULT_IDLE_THRESHOLD_DAYS = 7;

/** A consignment above this value likely needs an e-way bill. We only remind. */
export const EWAY_BILL_THRESHOLD_PAISE = 50_000 * PAISE_PER_RUPEE;

/** Non-urgent notifications are suppressed inside a user's quiet hours. */
export const DEFAULT_QUIET_HOURS = { startHour: 21, endHour: 6 } as const;

/** Issue ageing buckets, in days since the issue was raised. */
export const ISSUE_AGE_BUCKETS = [
  { key: '0-2', min: 0, max: 2 },
  { key: '3-7', min: 3, max: 7 },
  { key: '8-14', min: 8, max: 14 },
  { key: '15+', min: 15, max: Number.POSITIVE_INFINITY },
] as const;

/** Overtime is paid at the daily rate divided by this many hours. */
export const OVERTIME_HOURS_PER_DAY = 8;

/** Supported interface languages. Adding one means adding a message file. */
export const LOCALES = ['en', 'ta', 'hi'] as const;
export const DEFAULT_LOCALE = 'en';
