import { differenceInCalendarDays, addDays, format } from 'date-fns';

/**
 * Planned against actual progress over time.
 * Planned is a straight line from the project start date to the planned end
 * date. Actual comes from the progress recorded at the end of each day.
 */

export type ProgressPoint = { date: string; planned: number; actual: number | null };

/**
 * Builds the planned against actual series for a project.
 * Days with no report carry the previous day's actual forward, so the line
 * never drops to zero just because nobody submitted.
 */
export function buildProgressSeries(
  startDate: string | null,
  plannedEndDate: string | null,
  actualByDate: Map<string, number>,
  today: Date = new Date(),
): ProgressPoint[] {
  if (!startDate || !plannedEndDate) return [];

  const start = new Date(startDate);
  const end = new Date(plannedEndDate);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const lastDay = today < end ? today : end;
  const spanDays = Math.max(0, differenceInCalendarDays(lastDay, start));

  const points: ProgressPoint[] = [];
  let carried: number | null = null;

  for (let offset = 0; offset <= spanDays; offset += 1) {
    const date = format(addDays(start, offset), 'yyyy-MM-dd');
    const recorded = actualByDate.get(date);
    if (recorded !== undefined) carried = recorded;
    points.push({
      date,
      planned: Math.round((offset / totalDays) * 100),
      actual: carried,
    });
  }
  return points;
}

/**
 * Project health, derived by comparing actual progress against where the plan
 * says it should be today. Health drives the status chip on the owner view.
 */
export type ProjectHealth = 'on_track' | 'at_risk' | 'delayed';

/** Classifies health from the gap between actual and planned progress. */
export function calculateProjectHealth(
  actualPct: number,
  startDate: string | null,
  plannedEndDate: string | null,
  today: Date = new Date(),
): ProjectHealth {
  if (!startDate || !plannedEndDate) return 'on_track';
  const start = new Date(startDate);
  const end = new Date(plannedEndDate);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const elapsed = Math.max(0, differenceInCalendarDays(today, start));
  const expected = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const gap = expected - actualPct;
  if (gap >= 15) return 'delayed';
  if (gap >= 5) return 'at_risk';
  return 'on_track';
}

/**
 * Daily report compliance: reports submitted against reports expected, where
 * one is expected per active site per working day. Sundays and dates before
 * the project start are excluded.
 */
export function calculateDprCompliance(
  submittedDates: string[],
  startDate: string | null,
  days: number,
  today: Date = new Date(),
): { expected: number; submitted: number; pct: number } {
  const submitted = new Set(submittedDates);
  let expected = 0;
  let met = 0;

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset);
    if (day.getDay() === 0) continue; // Sunday is not a working day.
    if (startDate && day < new Date(startDate)) continue;
    expected += 1;
    if (submitted.has(format(day, 'yyyy-MM-dd'))) met += 1;
  }

  return { expected, submitted: met, pct: expected === 0 ? 0 : Math.round((met / expected) * 100) };
}
