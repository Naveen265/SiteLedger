import { cn } from '@/lib/utils/cn';

/**
 * The SiteLedger mark: a plumb line crossed by three ledger rows.
 * The wordmark sets "Site" in semibold and "Ledger" in regular, and is never
 * restyled, recoloured or given effects.
 */
export function Logo({ markOnly = false, className }: { markOnly?: boolean; className?: string }) {
  if (markOnly) {
    return (
      <svg viewBox="0 0 48 48" className={cn('size-7', className)} role="img" aria-label="SiteLedger">
        <rect x="6" y="6" width="4" height="36" rx="2" fill="#1B4965" />
        <circle cx="8" cy="42" r="4" fill="#1B4965" />
        <rect x="16" y="11" width="26" height="5" rx="2.5" fill="#1B4965" />
        <rect x="16" y="21" width="18" height="5" rx="2.5" fill="#5A6B7A" />
        <rect x="16" y="31" width="30" height="5" rx="2.5" fill="#0F7B4F" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 48" className={cn('h-7 w-auto', className)} role="img" aria-label="SiteLedger">
      <rect x="6" y="6" width="4" height="36" rx="2" fill="#1B4965" />
      <circle cx="8" cy="42" r="4" fill="#1B4965" />
      <rect x="16" y="11" width="26" height="5" rx="2.5" fill="#1B4965" />
      <rect x="16" y="21" width="18" height="5" rx="2.5" fill="#5A6B7A" />
      <rect x="16" y="31" width="30" height="5" rx="2.5" fill="#0F7B4F" />
      <text x="60" y="32" fontFamily="var(--font-sans)" fontSize="24" letterSpacing="-0.4">
        <tspan fill="#17212B" fontWeight="600">Site</tspan>
        <tspan fill="#1B4965" fontWeight="400">Ledger</tspan>
      </text>
    </svg>
  );
}
