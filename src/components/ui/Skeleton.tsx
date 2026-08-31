import { cn } from '@/lib/utils/cn';

/**
 * The loading placeholder primitive.
 * Every dynamic value in the product renders a skeleton in its own shape while
 * it loads, rather than a spinner that tells the user nothing about the layout.
 */
export function Skeleton({
  className, rounded = 'control', style,
}: {
  className?: string;
  rounded?: 'control' | 'card' | 'full';
  /** Used where the placeholder must match a fixed chart height. */
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn(
        'skeleton',
        rounded === 'card' && 'rounded-[var(--radius-card)]',
        rounded === 'control' && 'rounded-[var(--radius-control)]',
        rounded === 'full' && 'rounded-full',
        className,
      )}
    />
  );
}

/** A line of skeleton text at the given width. */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3.5 w-full', className)} />;
}
