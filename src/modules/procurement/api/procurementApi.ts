import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { rupeesToPaise } from '@/lib/format/currency';
import {
  nullIfEmpty, type GoodsReceiptInput, type PurchaseOrderInput, type VendorInput,
} from '@/lib/validation';
import type { GoodsReceipt, PurchaseOrder, Vendor } from '@/types/domain';

/**
 * Procurement reads and writes.
 * A goods receipt writes the stock movements that make stock on hand correct,
 * in the same transaction, so the ledger can never disagree with the receipt.
 */

/** Lists the company's vendors. */
export async function fetchVendors(companyId: string): Promise<Vendor[]> {
  return unwrap(
    await supabase.from('vendors').select('*').eq('company_id', companyId).order('name'),
  ) as Vendor[];
}

/** Creates a vendor. */
export async function createVendor(input: VendorInput, companyId: string): Promise<Vendor> {
  return unwrap(
    await supabase
      .from('vendors')
      .insert({
        company_id: companyId,
        name: input.name,
        gstin: nullIfEmpty(input.gstin),
        contact_phone: nullIfEmpty(input.contact_phone),
        contact_email: nullIfEmpty(input.contact_email),
        address: nullIfEmpty(input.address),
      })
      .select()
      .single(),
  ) as Vendor;
}

const PO_SELECT =
  '*, vendor:vendors(*), project:projects(id, name), items:purchase_order_items(*, material_item:material_items(*))';

/** Lists purchase orders for a company, newest first. */
export async function fetchPurchaseOrders(companyId: string): Promise<PurchaseOrder[]> {
  return unwrap(
    await supabase
      .from('purchase_orders')
      .select(PO_SELECT)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ) as PurchaseOrder[];
}

/** Reads one purchase order with its lines. */
export async function fetchPurchaseOrder(poId: string): Promise<PurchaseOrder> {
  return unwrap(
    await supabase.from('purchase_orders').select(PO_SELECT).eq('id', poId).single(),
  ) as PurchaseOrder;
}

/**
 * Creates a purchase order and its lines.
 * `sourceRequestItemIds` links each line back to the request that caused it,
 * which is what keeps the request as the single system of record.
 */
export async function createPurchaseOrder(
  input: PurchaseOrderInput,
  companyId: string,
  projectId: string,
  needsApproval: boolean,
  sourceRequestItemIds: Record<number, string> = {},
): Promise<PurchaseOrder> {
  const order = unwrap(
    await supabase
      .from('purchase_orders')
      .insert({
        company_id: companyId,
        project_id: projectId,
        vendor_id: input.vendor_id,
        po_number: `PO-${Date.now().toString(36).toUpperCase()}`,
        status: needsApproval ? 'pending_approval' : 'approved',
        expected_date: nullIfEmpty(input.expected_date),
        notes: nullIfEmpty(input.notes),
      })
      .select()
      .single(),
  ) as PurchaseOrder;

  const { error } = await supabase.from('purchase_order_items').insert(
    input.items.map((item, index) => ({
      purchase_order_id: order.id,
      material_item_id: item.material_item_id,
      quantity: item.quantity,
      rate_paise: rupeesToPaise(item.rate_rupees),
      gst_pct: item.gst_pct,
      source_request_item_id: sourceRequestItemIds[index] ?? null,
    })),
  );
  if (error) throw error;

  return order;
}

/** Approves a purchase order that was above the threshold. */
export async function approvePurchaseOrder(
  poId: string,
  approverProfileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({
      status: 'approved',
      approved_by: approverProfileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', poId);
  if (error) throw error;
}

/** Lists the goods receipts recorded against a project. */
export async function fetchGoodsReceipts(projectId: string): Promise<GoodsReceipt[]> {
  return unwrap(
    await supabase
      .from('goods_receipts')
      .select('*, items:goods_receipt_items(*)')
      .eq('project_id', projectId)
      .order('received_date', { ascending: false }),
  ) as GoodsReceipt[];
}

/**
 * Records a goods receipt.
 * The database function writes the receipt, its lines, the matching stock
 * movements and the new order status as one transaction, so a partial delivery
 * can never leave stock and the order disagreeing.
 */
export async function recordGoodsReceipt(input: {
  purchaseOrderId: string;
  projectId: string;
  receivedBy: string;
  challanPath: string | null;
  values: GoodsReceiptInput;
}): Promise<void> {
  const { error } = await supabase.rpc('record_goods_receipt', {
    p_purchase_order_id: input.purchaseOrderId,
    p_project_id: input.projectId,
    p_received_date: input.values.received_date,
    p_received_by: input.receivedBy,
    p_challan_path: input.challanPath,
    p_note: nullIfEmpty(input.values.note),
    p_items: input.values.items.filter((item) => item.quantity_received > 0),
  });
  if (error) throw error;
}
