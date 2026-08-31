/**
 * Chart colours and shared axis configuration.
 * Charts read from the same tokens as the rest of the interface, so nothing in
 * a chart contains a raw hex value.
 */

/** Resolves a CSS variable to its computed value, which Recharts needs. */
function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export const chartTheme = {
  get primary() { return token('--color-primary', '#1B4965'); },
  get ontrack() { return token('--color-status-ontrack', '#0F7B4F'); },
  get risk() { return token('--color-status-risk', '#B26A00'); },
  get delayed() { return token('--color-status-delayed', '#B02A20'); },
  get idle() { return token('--color-status-idle', '#6B7A88'); },
  get border() { return token('--color-border', '#DCE3E9'); },
  get inkMuted() { return token('--color-ink-muted', '#5A6B7A'); },
  get surface() { return token('--color-surface', '#FFFFFF'); },
};

/** The ordered palette for series that have no inherent status meaning. */
export function seriesColors(): string[] {
  return [
    chartTheme.primary,
    chartTheme.ontrack,
    chartTheme.risk,
    chartTheme.idle,
    chartTheme.delayed,
  ];
}

/** Axis styling shared by every chart, so all axes read identically. */
export const axisProps = {
  tick: { fontSize: 11, fill: chartTheme.inkMuted },
  tickLine: false,
  axisLine: { stroke: chartTheme.border },
} as const;
