import { differenceInCalendarDays } from 'date-fns';
import type { Asset, AssetMovement } from '@/types/domain';

/**
 * Equipment derivations.
 * Days in use, days idle and idle-beyond-threshold all come from the movement
 * log. A counter that has to be kept in sync is never stored.
 */

export type AssetUtilisation = {
  asset_id: string;
  name: string;
  days_in_use: number;
  days_idle: number;
  days_under_repair: number;
  /** How long the asset has sat with no site allocation, right now. */
  current_idle_days: number;
  is_idle_beyond_threshold: boolean;
};

/** Whether a movement type leaves the asset allocated to a site. */
function isAllocatedAfter(movementType: AssetMovement['movement_type']): boolean {
  return movementType === 'checkout' || movementType === 'transfer' || movementType === 'repair_in';
}

/**
 * Walks an asset's movement log and totals the days spent in each state.
 * Days in use is the number of days the asset was allocated to a site. Days
 * idle is the number of days it sat in the yard or at a site with no
 * allocation. Days under repair are counted separately and in neither.
 */
export function calculateAssetUtilisation(
  asset: Asset,
  movements: AssetMovement[],
  periodStart: Date,
  periodEnd: Date = new Date(),
): AssetUtilisation {
  const ordered = [...movements].sort(
    (a, b) => new Date(a.moved_at).getTime() - new Date(b.moved_at).getTime(),
  );

  let inUse = 0;
  let idle = 0;
  let underRepair = 0;

  // Walk each interval between consecutive movements and attribute its days.
  let cursor = periodStart;
  let state: 'in_use' | 'idle' | 'under_repair' = 'idle';

  for (const movement of ordered) {
    const at = new Date(movement.moved_at);
    if (at > periodEnd) break;

    if (at > cursor) {
      const days = differenceInCalendarDays(at, cursor);
      if (state === 'in_use') inUse += days;
      else if (state === 'under_repair') underRepair += days;
      else idle += days;
      cursor = at;
    }

    if (movement.movement_type === 'repair_out') state = 'under_repair';
    else if (isAllocatedAfter(movement.movement_type) && movement.to_project_id) state = 'in_use';
    else state = 'idle';
  }

  // Attribute the tail from the last movement to the end of the period.
  if (periodEnd > cursor) {
    const days = differenceInCalendarDays(periodEnd, cursor);
    if (state === 'in_use') inUse += days;
    else if (state === 'under_repair') underRepair += days;
    else idle += days;
  }

  const currentIdleDays = calculateCurrentIdleDays(asset, ordered, periodEnd);

  return {
    asset_id: asset.id,
    name: asset.name,
    days_in_use: inUse,
    days_idle: idle,
    days_under_repair: underRepair,
    current_idle_days: currentIdleDays,
    is_idle_beyond_threshold: currentIdleDays > asset.idle_threshold_days,
  };
}

/**
 * How many days the asset has been idle as of now, counted from the movement
 * that left it without a site allocation. Returns zero if it is allocated.
 */
export function calculateCurrentIdleDays(
  asset: Asset,
  movements: AssetMovement[],
  now: Date = new Date(),
): number {
  if (asset.status !== 'idle') return 0;
  const ordered = [...movements].sort(
    (a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime(),
  );
  const lastMovement = ordered[0];
  const since = lastMovement ? new Date(lastMovement.moved_at) : new Date(asset.created_at);
  return Math.max(0, differenceInCalendarDays(now, since));
}

/** Days remaining before a rented asset is due back. Negative means overdue. */
export function calculateRentalDaysRemaining(
  asset: Asset,
  now: Date = new Date(),
): number | null {
  if (asset.ownership !== 'rented' || !asset.rental_due_date) return null;
  return differenceInCalendarDays(new Date(asset.rental_due_date), now);
}

/** Assets whose rental return date has passed or is within the warning window. */
export function findRentalsDueSoon(assets: Asset[], withinDays = 7): Asset[] {
  return assets.filter((asset) => {
    const remaining = calculateRentalDaysRemaining(asset);
    return remaining !== null && remaining <= withinDays && asset.status !== 'returned';
  });
}

/** Assets sitting idle for longer than their own threshold. */
export function findIdleBeyondThreshold(
  assets: Asset[],
  movementsByAsset: Map<string, AssetMovement[]>,
): Asset[] {
  return assets.filter((asset) => {
    const idleDays = calculateCurrentIdleDays(asset, movementsByAsset.get(asset.id) ?? []);
    return idleDays > asset.idle_threshold_days;
  });
}
