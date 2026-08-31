import type {
  GoodsReceipt, MaterialItem, PurchaseOrder, PurchaseOrderItem, StockMovement,
} from '@/types/domain';
import { sumBy } from '@/lib/utils/collections';

/**
 * Material and procurement derivations.
 * Stock on hand is never a stored column: it is always the movement ledger
 * summed, which is the only way it stays consistent with corrections.
 */

export type StockLine = {
  material_item_id: string;
  name: string;
  unit: string;
  received: number;
  issued: number;
  on_hand: number;
  low_stock_threshold: number | null;
  is_low: boolean;
};

/** Signs a movement so receipts and transfers in add, issues and transfers out subtract. */
function signedQuantity(movement: StockMovement): number {
  switch (movement.movement_type) {
    case 'receipt':
    case 'transfer_in':
      return movement.quantity;
    case 'issue':
    case 'transfer_out':
      return -movement.quantity;
    case 'adjustment':
      // An adjustment carries its own sign, positive or negative.
      return movement.quantity;
  }
}

/**
 * Builds the stock position for one project from the movement ledger.
 * On hand is total received minus total issued for that item at that site.
 */
export function calculateStockOnHand(
  movements: StockMovement[],
  items: MaterialItem[],
): StockLine[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const totals = new Map<string, { received: number; issued: number }>();

  for (const movement of movements) {
    const bucket = totals.get(movement.material_item_id) ?? { received: 0, issued: 0 };
    const signed = signedQuantity(movement);
    if (signed >= 0) bucket.received += signed;
    else bucket.issued += Math.abs(signed);
    totals.set(movement.material_item_id, bucket);
  }

  return Array.from(totals.entries())
    .map(([materialItemId, bucket]) => {
      const item = itemsById.get(materialItemId);
      const onHand = bucket.received - bucket.issued;
      const threshold = item?.low_stock_threshold ?? null;
      return {
        material_item_id: materialItemId,
        name: item?.name ?? 'Unknown item',
        unit: item?.unit ?? '',
        received: bucket.received,
        issued: bucket.issued,
        on_hand: onHand,
        low_stock_threshold: threshold,
        is_low: threshold !== null && onHand <= threshold,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Top materials consumed in a period.
 * Only quantity issued from store to site counts. Material received but still
 * sitting in store is not counted, because it has not been consumed yet.
 */
export function calculateTopMaterialsConsumed(
  movements: StockMovement[],
  items: MaterialItem[],
  limit = 8,
): Array<{ name: string; quantity: number; unit: string }> {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const issued = new Map<string, number>();

  for (const movement of movements) {
    if (movement.movement_type !== 'issue') continue;
    issued.set(
      movement.material_item_id,
      (issued.get(movement.material_item_id) ?? 0) + movement.quantity,
    );
  }

  return Array.from(issued.entries())
    .map(([id, quantity]) => ({
      name: itemsById.get(id)?.name ?? 'Unknown item',
      unit: itemsById.get(id)?.unit ?? '',
      quantity,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

/** Line value before tax, in paise. */
export function calculatePoItemNetPaise(item: PurchaseOrderItem): number {
  return Math.round(item.quantity * item.rate_paise);
}

/** Tax on a line, in paise, from the GST percentage captured on the order. */
export function calculatePoItemGstPaise(item: PurchaseOrderItem): number {
  return Math.round(calculatePoItemNetPaise(item) * (item.gst_pct / 100));
}

/** Line value including tax, in paise. */
export function calculatePoItemGrossPaise(item: PurchaseOrderItem): number {
  return calculatePoItemNetPaise(item) + calculatePoItemGstPaise(item);
}

/** Order value including tax, in paise. */
export function calculatePoTotalPaise(order: PurchaseOrder): number {
  return sumBy(order.items ?? [], calculatePoItemGrossPaise);
}

/**
 * Pending quantity on an order line: ordered quantity minus the quantity
 * received across every goods receipt raised against that order.
 */
export function calculatePendingQuantity(
  item: PurchaseOrderItem,
  receipts: GoodsReceipt[],
): number {
  const received = receipts
    .flatMap((receipt) => receipt.items ?? [])
    .filter((line) => line.purchase_order_item_id === item.id)
    .reduce((total, line) => total + line.quantity_received, 0);
  return Math.max(0, item.quantity - received);
}

/** Value of goods actually received against an order, in paise. */
export function calculateReceivedValuePaise(
  order: PurchaseOrder,
  receipts: GoodsReceipt[],
): number {
  return sumBy(order.items ?? [], (item) => {
    const pending = calculatePendingQuantity(item, receipts);
    const received = item.quantity - pending;
    return Math.round(received * item.rate_paise * (1 + item.gst_pct / 100));
  });
}
