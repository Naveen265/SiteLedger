import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { rupeesToPaise } from '@/lib/format/currency';
import {
  nullIfEmpty, type MaterialItemInput, type MaterialRequestInput, type StockIssueInput,
} from '@/lib/validation';
import type { MaterialItem, MaterialRequest, StockMovement } from '@/types/domain';

/**
 * Materials reads and writes.
 * The material request created at site is the single record that threads
 * through approval, purchase order and goods receipt. Procurement never
 * retypes it, which is how duplicate entry is eliminated.
 */

/** Lists the company's material master. */
export async function fetchMaterialItems(companyId: string): Promise<MaterialItem[]> {
  return unwrap(
    await supabase.from('material_items').select('*').eq('company_id', companyId).order('name'),
  ) as MaterialItem[];
}

/** Creates or updates a material item. */
export async function saveMaterialItem(
  input: MaterialItemInput,
  companyId: string,
  itemId?: string,
): Promise<MaterialItem> {
  const row = {
    company_id: companyId,
    name: input.name,
    unit: input.unit,
    category: nullIfEmpty(input.category),
    standard_rate_paise: input.standard_rate_rupees ? rupeesToPaise(input.standard_rate_rupees) : null,
    low_stock_threshold: input.low_stock_threshold ?? null,
  };
  return unwrap(
    itemId
      ? await supabase.from('material_items').update(row).eq('id', itemId).select().single()
      : await supabase.from('material_items').insert(row).select().single(),
  ) as MaterialItem;
}

const REQUEST_SELECT =
  '*, requester:profiles!material_requests_requested_by_fkey(*), project:projects(id, name), items:material_request_items(*, material_item:material_items(*))';

/** Lists the material requests raised on a project. */
export async function fetchMaterialRequests(projectId: string): Promise<MaterialRequest[]> {
  return unwrap(
    await supabase
      .from('material_requests')
      .select(REQUEST_SELECT)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ) as MaterialRequest[];
}

/** Lists requests still waiting for action across every project in a company. */
export async function fetchPendingRequests(projectIds: string[]): Promise<MaterialRequest[]> {
  if (projectIds.length === 0) return [];
  return unwrap(
    await supabase
      .from('material_requests')
      .select(REQUEST_SELECT)
      .in('project_id', projectIds)
      .in('status', ['submitted', 'approved'])
      .order('needed_by', { ascending: true, nullsFirst: false }),
  ) as MaterialRequest[];
}

/** Creates a request together with its line items, in one round trip. */
export async function createMaterialRequest(
  input: MaterialRequestInput,
  projectId: string,
  requestedBy: string,
): Promise<MaterialRequest> {
  const request = unwrap(
    await supabase
      .from('material_requests')
      .insert({
        project_id: projectId,
        requested_by: requestedBy,
        needed_by: nullIfEmpty(input.needed_by),
        note: nullIfEmpty(input.note),
        status: 'submitted',
      })
      .select()
      .single(),
  ) as MaterialRequest;

  const { error } = await supabase.from('material_request_items').insert(
    input.items.map((item) => ({
      request_id: request.id,
      material_item_id: item.material_item_id ?? null,
      free_text_name: nullIfEmpty(item.free_text_name),
      quantity: item.quantity,
      unit: item.unit,
    })),
  );
  if (error) throw error;

  return request;
}

/** Approves or rejects a request, recording who decided and when. */
export async function decideMaterialRequest(
  requestId: string,
  decision: 'approved' | 'rejected',
  approverProfileId: string,
  rejectReason?: string,
): Promise<void> {
  const { error } = await supabase
    .from('material_requests')
    .update({
      status: decision,
      approved_by: approverProfileId,
      approved_at: new Date().toISOString(),
      reject_reason: decision === 'rejected' ? (rejectReason ?? null) : null,
    })
    .eq('id', requestId);
  if (error) throw error;
}

/** Reads the whole movement ledger for a project. Stock is derived from it. */
export async function fetchStockMovements(projectId: string): Promise<StockMovement[]> {
  return unwrap(
    await supabase
      .from('stock_movements')
      .select('*, material_item:material_items(*)')
      .eq('project_id', projectId)
      .order('moved_at', { ascending: false }),
  ) as StockMovement[];
}

/**
 * Issues stock from store to site.
 * Issuing reduces the derived stock position and tags the task it went to, so
 * consumed value can feed project cost without a second entry.
 */
export async function issueStock(
  input: StockIssueInput,
  projectId: string,
  movedBy: string,
): Promise<void> {
  const { error } = await supabase.from('stock_movements').insert({
    project_id: projectId,
    material_item_id: input.material_item_id,
    movement_type: 'issue',
    quantity: input.quantity,
    issued_to_task_id: input.issued_to_task_id ?? null,
    moved_by: movedBy,
    moved_at: new Date().toISOString(),
    note: nullIfEmpty(input.note),
  });
  if (error) throw error;
}
