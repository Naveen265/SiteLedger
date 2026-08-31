import { cn } from '@/lib/utils/cn';

/**
 * A tab strip.
 * Implemented with the tablist role so arrow keys move between tabs, which is
 * what a keyboard user expects.
 */
export type TabItem = { value: string; label: string; count?: number };

export function Tabs({
  items, value, onChange, className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  /** Moves the active tab with the arrow keys, wrapping at both ends. */
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + delta + items.length) % items.length;
    onChange(items[next].value);
  };

  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}>
      {items.map((item, index) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors duration-150',
              isActive ? 'text-primary' : 'text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-1.5 tabular text-ink-faint">{item.count}</span>
            )}
            {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
