/**
 * Small, pure collection helpers used across modules.
 * Kept here so no module reimplements grouping or summing locally.
 */

/** Groups rows by a key derived from each row. */
export function groupBy<T, K extends string | number>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const bucket = out.get(k);
    if (bucket) bucket.push(row);
    else out.set(k, [row]);
  }
  return out;
}

/** Sums a numeric field across rows, treating null and undefined as zero. */
export function sumBy<T>(rows: T[], value: (row: T) => number | null | undefined): number {
  return rows.reduce((total, row) => total + (value(row) ?? 0), 0);
}

/** Builds a lookup map from a list, keyed by id. */
export function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.id, row]));
}

/** Counts how many rows fall into each key. */
export function countBy<T, K extends string>(rows: T[], key: (row: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const row of rows) {
    const k = key(row);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/** Returns a stable, comparator-driven sorted copy. Never mutates the input. */
export function sortBy<T>(rows: T[], compare: (a: T, b: T) => number): T[] {
  return [...rows].sort(compare);
}

/** Removes duplicates while preserving first-seen order. */
export function unique<T>(rows: T[]): T[] {
  return Array.from(new Set(rows));
}
