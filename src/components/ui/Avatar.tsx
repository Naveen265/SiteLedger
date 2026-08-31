import { cn } from '@/lib/utils/cn';

/** Initials from a full name, used when a person has no uploaded photo. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** A person's avatar, falling back to their initials. */
export function Avatar({
  name, src, size = 'md', className,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClass = { sm: 'size-6 text-2xs', md: 'size-8 text-xs', lg: 'size-10 text-sm' }[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={cn('shrink-0 rounded-full object-cover', sizeClass, className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'bg-primary-subtle font-semibold text-primary',
        sizeClass,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
