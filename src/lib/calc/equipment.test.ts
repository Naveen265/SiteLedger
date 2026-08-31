import { describe, expect, it } from 'vitest';
import {
  calculateCurrentIdleDays, calculateRentalDaysRemaining, findRentalsDueSoon,
} from './equipment';
import type { Asset, AssetMovement } from '@/types/domain';

/** Builds an asset with only the fields the equipment maths reads. */
function asset(partial: Partial<Asset>): Asset {
  return {
    id: 'a1', company_id: 'c1', created_at: '2026-08-01T00:00:00Z', updated_at: '',
    name: 'JCB 3DX backhoe', asset_type: 'machine', ownership: 'owned',
    identifier: null, set_quantity: null, purchase_value_paise: null,
    rental_vendor_id: null, rental_start_date: null, rental_due_date: null,
    rental_rate_paise: null, status: 'idle', current_project_id: null,
    photo_path: null, idle_threshold_days: 7,
    ...partial,
  };
}

/** Builds a movement row that left the asset in the yard on a given date. */
function returnToYard(movedAt: string): AssetMovement {
  return {
    id: `m-${movedAt}`, created_at: '', updated_at: '',
    asset_id: 'a1', from_project_id: 'p1', to_project_id: null,
    movement_type: 'return_to_yard', moved_at: movedAt, moved_by: 'u1', condition_note: null,
  };
}

const NOW = new Date('2026-08-31T00:00:00Z');

describe('calculateCurrentIdleDays', () => {
  it('counts from the movement that left the asset unallocated', () => {
    const days = calculateCurrentIdleDays(
      asset({ status: 'idle' }),
      [returnToYard('2026-08-20T00:00:00Z')],
      NOW,
    );
    expect(days).toBe(11);
  });

  it('is zero while the asset is allocated to a site', () => {
    const days = calculateCurrentIdleDays(
      asset({ status: 'in_use', current_project_id: 'p1' }),
      [returnToYard('2026-08-01T00:00:00Z')],
      NOW,
    );
    expect(days).toBe(0);
  });

  it('falls back to the creation date when there is no movement yet', () => {
    expect(calculateCurrentIdleDays(asset({ status: 'idle' }), [], NOW)).toBe(30);
  });
});

describe('calculateRentalDaysRemaining', () => {
  it('is null for an owned asset', () => {
    expect(calculateRentalDaysRemaining(asset({ ownership: 'owned' }), NOW)).toBeNull();
  });

  it('is positive while the return date is still ahead', () => {
    const remaining = calculateRentalDaysRemaining(
      asset({ ownership: 'rented', rental_due_date: '2026-09-05' }),
      NOW,
    );
    expect(remaining).toBe(5);
  });

  it('is negative once the return date has passed', () => {
    const remaining = calculateRentalDaysRemaining(
      asset({ ownership: 'rented', rental_due_date: '2026-08-28' }),
      NOW,
    );
    expect(remaining).toBe(-3);
  });
});

describe('findRentalsDueSoon', () => {
  it('returns rentals due within the window and those already overdue', () => {
    const due = findRentalsDueSoon(
      [
        asset({ id: '1', ownership: 'rented', rental_due_date: '2026-08-28', status: 'in_use' }),
        asset({ id: '2', ownership: 'rented', rental_due_date: '2099-01-01', status: 'in_use' }),
        asset({ id: '3', ownership: 'owned' }),
      ],
      7,
    );
    expect(due.map((row) => row.id)).toEqual(['1']);
  });
});
