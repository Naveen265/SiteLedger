import { describe, expect, it } from 'vitest';
import { calculateHeadcount, calculateLabourCostPaise, calculateWageLine } from './labour';
import type { Attendance, WageAdvance, Worker } from '@/types/domain';

/** A worker on a 1000 rupee daily rate, which makes the arithmetic readable. */
const worker: Worker = {
  id: 'w1', company_id: 'c1', created_at: '', updated_at: '',
  full_name: 'Karthik Raja', phone: null, category: 'mason',
  daily_rate_paise: 100000, contractor_id: null, photo_path: null, is_active: true,
};

/** Builds one attendance row for the worker above. */
function attendance(dayValue: number, overtimeHours = 0, date = '2026-08-01'): Attendance {
  return {
    id: `a-${date}-${dayValue}-${overtimeHours}`, created_at: '', updated_at: '',
    project_id: 'p1', worker_id: 'w1', attendance_date: date,
    day_value: dayValue, overtime_hours: overtimeHours, marked_by: 'u1',
  };
}

/** Builds one advance row for the worker above. */
function advance(amountPaise: number): WageAdvance {
  return {
    id: 'adv1', created_at: '', updated_at: '',
    worker_id: 'w1', project_id: 'p1', amount_paise: amountPaise,
    advance_date: '2026-08-05', recorded_by: 'u1', note: null,
  };
}

describe('calculateWageLine', () => {
  it('pays a full day at the daily rate', () => {
    const line = calculateWageLine(worker, [attendance(1)], []);
    expect(line.days_worked).toBe(1);
    expect(line.base_paise).toBe(100000);
    expect(line.payable_paise).toBe(100000);
  });

  it('counts a half day as 0.5 of the daily rate', () => {
    const line = calculateWageLine(worker, [attendance(0.5)], []);
    expect(line.days_worked).toBe(0.5);
    expect(line.base_paise).toBe(50000);
    expect(line.half_days).toBe(1);
  });

  it('pays nothing for an absent day but still records it', () => {
    const line = calculateWageLine(worker, [attendance(0)], []);
    expect(line.base_paise).toBe(0);
    expect(line.absent_days).toBe(1);
  });

  it('pays overtime at the daily rate divided by eight, per hour', () => {
    const line = calculateWageLine(worker, [attendance(1, 4)], []);
    // 4 hours at 100000 / 8 = 12500 per hour.
    expect(line.overtime_paise).toBe(50000);
    expect(line.payable_paise).toBe(150000);
  });

  it('subtracts advances recorded in the period', () => {
    const line = calculateWageLine(worker, [attendance(1), attendance(1, 0, '2026-08-02')], [advance(60000)]);
    expect(line.base_paise).toBe(200000);
    expect(line.advances_paise).toBe(60000);
    expect(line.payable_paise).toBe(140000);
  });

  it('handles a full period with mixed day values, overtime and an advance', () => {
    const line = calculateWageLine(
      worker,
      [
        attendance(1, 2, '2026-08-01'),
        attendance(0.5, 0, '2026-08-02'),
        attendance(0, 0, '2026-08-03'),
        attendance(1, 0, '2026-08-04'),
      ],
      [advance(25000)],
    );
    expect(line.days_worked).toBe(2.5);
    expect(line.base_paise).toBe(250000);
    expect(line.overtime_paise).toBe(25000);
    expect(line.payable_paise).toBe(250000);
  });
});

describe('calculateLabourCostPaise', () => {
  it('does not subtract advances, because cost incurred is not cash to hand over', () => {
    const line = calculateWageLine(worker, [attendance(1)], [advance(40000)]);
    expect(line.payable_paise).toBe(60000);
    expect(calculateLabourCostPaise([line])).toBe(100000);
  });
});

describe('calculateHeadcount', () => {
  it('counts a half day as one person, because this is about who was on site', () => {
    const rows = [attendance(1, 0, 'd1'), attendance(0.5, 0, 'd2'), attendance(0, 0, 'd3')];
    expect(calculateHeadcount(rows)).toBe(2);
  });
});
