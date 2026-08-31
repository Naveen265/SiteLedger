import { OVERTIME_HOURS_PER_DAY } from '@/config/constants';
import type { Attendance, WageAdvance, Worker } from '@/types/domain';
import { sumBy } from '@/lib/utils/collections';

/**
 * Labour and wage calculations.
 * SiteLedger calculates wages payable. It is not statutory payroll: provident
 * fund, employee state insurance and tax are deliberately not computed here.
 */

export type WageLine = {
  worker_id: string;
  worker_name: string;
  category: string;
  contractor_id: string | null;
  contractor_name: string | null;
  daily_rate_paise: number;
  /** Sum of day values in the period, so a half day contributes 0.5. */
  days_worked: number;
  present_days: number;
  half_days: number;
  absent_days: number;
  overtime_hours: number;
  base_paise: number;
  overtime_paise: number;
  advances_paise: number;
  /** Base plus overtime minus advances. This is the payable figure. */
  payable_paise: number;
};

/**
 * Calculates one worker's wage line for a period.
 * Base is the daily rate multiplied by the sum of day values, where present
 * counts as 1 and half day as 0.5. Overtime is paid at the daily rate divided
 * by eight, per hour. Recorded advances in the period are then subtracted.
 */
export function calculateWageLine(
  worker: Worker,
  attendance: Attendance[],
  advances: WageAdvance[],
): WageLine {
  const daysWorked = sumBy(attendance, (row) => row.day_value);
  const overtimeHours = sumBy(attendance, (row) => row.overtime_hours);
  const basePaise = Math.round(worker.daily_rate_paise * daysWorked);
  const overtimePaise = Math.round(
    (worker.daily_rate_paise / OVERTIME_HOURS_PER_DAY) * overtimeHours,
  );
  const advancesPaise = sumBy(advances, (row) => row.amount_paise);

  return {
    worker_id: worker.id,
    worker_name: worker.full_name,
    category: worker.category,
    contractor_id: worker.contractor_id,
    contractor_name: worker.contractor?.name ?? null,
    daily_rate_paise: worker.daily_rate_paise,
    days_worked: daysWorked,
    present_days: attendance.filter((row) => row.day_value === 1).length,
    half_days: attendance.filter((row) => row.day_value === 0.5).length,
    absent_days: attendance.filter((row) => row.day_value === 0).length,
    overtime_hours: overtimeHours,
    base_paise: basePaise,
    overtime_paise: overtimePaise,
    advances_paise: advancesPaise,
    payable_paise: basePaise + overtimePaise - advancesPaise,
  };
}

/** Builds wage lines for every worker who has attendance in the period. */
export function calculateWageSummary(
  workers: Worker[],
  attendance: Attendance[],
  advances: WageAdvance[],
): WageLine[] {
  return workers
    .map((worker) =>
      calculateWageLine(
        worker,
        attendance.filter((row) => row.worker_id === worker.id),
        advances.filter((row) => row.worker_id === worker.id),
      ),
    )
    .filter((line) => line.days_worked > 0 || line.advances_paise > 0);
}

/**
 * Labour cost incurred for a set of wage lines.
 * Advances are not subtracted here, because cost incurred is not the same as
 * cash still to hand over.
 */
export function calculateLabourCostPaise(lines: WageLine[]): number {
  return sumBy(lines, (line) => line.base_paise + line.overtime_paise);
}

/**
 * Headcount on a given date.
 * A half day counts as one person, because this figure answers how many people
 * were on site, not how much they cost.
 */
export function calculateHeadcount(attendance: Attendance[]): number {
  return attendance.filter((row) => row.day_value > 0).length;
}

/** Groups attendance into a date-keyed headcount series for the trend chart. */
export function calculateHeadcountTrend(
  attendance: Attendance[],
): Array<{ date: string; headcount: number }> {
  const byDate = new Map<string, number>();
  for (const row of attendance) {
    if (row.day_value <= 0) continue;
    byDate.set(row.attendance_date, (byDate.get(row.attendance_date) ?? 0) + 1);
  }
  return Array.from(byDate.entries())
    .map(([date, headcount]) => ({ date, headcount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Totals the payable column across wage lines. */
export function calculateTotalPayablePaise(lines: WageLine[]): number {
  return sumBy(lines, (line) => line.payable_paise);
}
