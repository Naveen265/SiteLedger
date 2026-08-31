/**
 * CSV export. Kept deliberately small: the product exports records so a company
 * owns its data, it does not build spreadsheets.
 */

/** Escapes a single CSV cell, quoting only when the value needs it. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

/** Serialises rows to CSV text using the supplied column definitions. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(','));
  return [head, ...body].join('\n');
}

/** Triggers a browser download of the given CSV text. */
export function downloadCsv(filename: string, csv: string): void {
  // The BOM makes Excel and Tally open Unicode names correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
