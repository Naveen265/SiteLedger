import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils/cn';

/**
 * Shaped loading placeholders.
 * Each one mirrors the layout of the content it replaces, so the page does not
 * jump when the data arrives.
 */

/** A grid of metric tiles. */
export function MetricGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-24" />
          <Skeleton className="mt-2 h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A chart card, header included. */
export function ChartSkeleton({ height = 260, className }: { height?: number; className?: string }) {
  return (
    <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface', className)}>
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-3.5 w-36" />
      </div>
      <div className="p-4">
        <Skeleton className="w-full" style={{ height }} />
      </div>
    </div>
  );
}

/** A vertical list of records, as used on the site shell and in side panels. */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3"
        >
          <Skeleton className="size-9" rounded="full" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="mt-2 h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** A form, while its pre-filled values are being fetched. */
export function FormSkeleton({ fields = 5, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-1.5 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** A grid of project or asset cards. */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="mt-3 h-2.5 w-24" />
          <Skeleton className="mt-4 h-1.5 w-full" />
          <div className="mt-4 flex gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** The whole dashboard, as one composed placeholder. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <MetricGridSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <ListSkeleton />
    </div>
  );
}
