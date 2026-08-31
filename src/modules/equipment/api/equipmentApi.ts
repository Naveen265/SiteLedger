import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { rupeesToPaise } from '@/lib/format/currency';
import { nullIfEmpty, type AssetInput } from '@/lib/validation';
import type { Asset, AssetCost, AssetMovement } from '@/types/domain';
import type { AssetMovementType } from '@/types/enums';

/**
 * Equipment reads and writes.
 * This is the module the product is positioned on, so the register is built
 * properly: every movement is logged, and nothing is a counter kept in sync.
 */

const ASSET_SELECT = '*, current_project:projects(id, name), rental_vendor:vendors(id, name)';

/** Lists every asset the company owns or rents. */
export async function fetchAssets(companyId: string): Promise<Asset[]> {
  return unwrap(
    await supabase
      .from('assets')
      .select(ASSET_SELECT)
      .eq('company_id', companyId)
      .order('name'),
  ) as Asset[];
}

/** Reads one asset. */
export async function fetchAsset(assetId: string): Promise<Asset> {
  return unwrap(
    await supabase.from('assets').select(ASSET_SELECT).eq('id', assetId).single(),
  ) as Asset;
}

/** Reads the full movement history for an asset, oldest first. */
export async function fetchAssetMovements(assetId: string): Promise<AssetMovement[]> {
  return unwrap(
    await supabase
      .from('asset_movements')
      .select('*, from_project:projects!asset_movements_from_project_id_fkey(id, name), to_project:projects!asset_movements_to_project_id_fkey(id, name)')
      .eq('asset_id', assetId)
      .order('moved_at'),
  ) as AssetMovement[];
}

/** Reads rental and repair costs, which feed project spend. */
export async function fetchAssetCosts(companyId: string): Promise<AssetCost[]> {
  return unwrap(
    await supabase
      .from('asset_costs')
      .select('*, asset:assets!inner(company_id)')
      .eq('asset.company_id', companyId),
  ) as AssetCost[];
}

/** Creates or updates an asset, converting typed rupee values into paise. */
export async function saveAsset(
  input: AssetInput,
  companyId: string,
  assetId?: string,
): Promise<Asset> {
  const row = {
    company_id: companyId,
    name: input.name,
    asset_type: input.asset_type,
    ownership: input.ownership,
    identifier: nullIfEmpty(input.identifier),
    set_quantity: input.set_quantity ?? null,
    purchase_value_paise: input.purchase_value_rupees ? rupeesToPaise(input.purchase_value_rupees) : null,
    rental_vendor_id: input.rental_vendor_id ?? null,
    rental_start_date: nullIfEmpty(input.rental_start_date),
    rental_due_date: nullIfEmpty(input.rental_due_date),
    rental_rate_paise: input.rental_rate_rupees ? rupeesToPaise(input.rental_rate_rupees) : null,
    idle_threshold_days: input.idle_threshold_days,
  };

  return unwrap(
    assetId
      ? await supabase.from('assets').update(row).eq('id', assetId).select().single()
      : await supabase.from('assets').insert({ ...row, status: 'idle' }).select().single(),
  ) as Asset;
}

/** The status an asset lands in after each kind of movement. */
const STATUS_AFTER: Record<AssetMovementType, Asset['status']> = {
  checkout: 'in_use',
  transfer: 'in_use',
  return_to_yard: 'idle',
  return_to_vendor: 'returned',
  repair_out: 'under_repair',
  repair_in: 'idle',
};

/**
 * Moves an asset and records the movement.
 * The movement row is the source of truth for idle days and utilisation; the
 * status and current site on the asset are a convenience for list screens.
 */
export async function moveAsset(input: {
  asset: Asset;
  movementType: AssetMovementType;
  toProjectId: string | null;
  movedBy: string;
  conditionNote: string | null;
}): Promise<void> {
  const { error: movementError } = await supabase.from('asset_movements').insert({
    asset_id: input.asset.id,
    from_project_id: input.asset.current_project_id,
    to_project_id: input.toProjectId,
    movement_type: input.movementType,
    moved_at: new Date().toISOString(),
    moved_by: input.movedBy,
    condition_note: input.conditionNote,
  });
  if (movementError) throw movementError;

  const { error } = await supabase
    .from('assets')
    .update({
      status: STATUS_AFTER[input.movementType],
      current_project_id: input.toProjectId,
    })
    .eq('id', input.asset.id);
  if (error) throw error;
}

/** Records a rental, repair or transport cost against an asset. */
export async function recordAssetCost(input: {
  assetId: string;
  projectId: string | null;
  costType: AssetCost['cost_type'];
  amountRupees: number;
  incurredOn: string;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase.from('asset_costs').insert({
    asset_id: input.assetId,
    project_id: input.projectId,
    cost_type: input.costType,
    amount_paise: rupeesToPaise(input.amountRupees),
    incurred_on: input.incurredOn,
    note: input.note,
  });
  if (error) throw error;
}
