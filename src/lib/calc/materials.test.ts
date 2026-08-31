import { describe, expect, it } from 'vitest';
import { calculatePendingQuantity, calculateStockOnHand, calculateTopMaterialsConsumed } from './materials';
import type { GoodsReceipt, MaterialItem, PurchaseOrderItem, StockMovement } from '@/types/domain';

const cement: MaterialItem = {
  id: 'm1', company_id: 'c1', created_at: '', updated_at: '',
  name: 'OPC 53 grade cement', unit: 'bag', category: 'Cement',
  standard_rate_paise: 42000, low_stock_threshold: 50,
};

/** Builds a movement row with only the fields the ledger maths reads. */
function movement(type: StockMovement['movement_type'], quantity: number): StockMovement {
  return {
    id: `${type}-${quantity}`, created_at: '', updated_at: '',
    project_id: 'p1', material_item_id: 'm1', movement_type: type, quantity,
    reference_table: null, reference_id: null, issued_to_task_id: null,
    moved_by: 'u1', moved_at: '2026-08-01T00:00:00Z', note: null,
  };
}

describe('calculateStockOnHand', () => {
  it('is total received minus total issued', () => {
    const [line] = calculateStockOnHand(
      [movement('receipt', 260), movement('issue', 180)],
      [cement],
    );
    expect(line.received).toBe(260);
    expect(line.issued).toBe(180);
    expect(line.on_hand).toBe(80);
  });

  it('treats a transfer in as a receipt and a transfer out as an issue', () => {
    const [line] = calculateStockOnHand(
      [movement('transfer_in', 50), movement('transfer_out', 20)],
      [cement],
    );
    expect(line.on_hand).toBe(30);
  });

  it('flags the item when on hand falls to or below the threshold', () => {
    const [line] = calculateStockOnHand(
      [movement('receipt', 100), movement('issue', 60)],
      [cement],
    );
    expect(line.on_hand).toBe(40);
    expect(line.is_low).toBe(true);
  });

  it('does not flag an item with no threshold set', () => {
    const [line] = calculateStockOnHand(
      [movement('receipt', 1)],
      [{ ...cement, low_stock_threshold: null }],
    );
    expect(line.is_low).toBe(false);
  });
});

describe('calculateTopMaterialsConsumed', () => {
  it('counts only what was issued, not what is sitting in store', () => {
    const rows = calculateTopMaterialsConsumed(
      [movement('receipt', 500), movement('issue', 120)],
      [cement],
    );
    expect(rows).toEqual([{ name: cement.name, unit: 'bag', quantity: 120 }]);
  });
});

describe('calculatePendingQuantity', () => {
  const item: PurchaseOrderItem = {
    id: 'poi1', created_at: '', updated_at: '',
    purchase_order_id: 'po1', material_item_id: 'm1',
    quantity: 400, rate_paise: 42000, gst_pct: 28, source_request_item_id: null,
  };

  /** Builds a receipt carrying one line against the order item above. */
  function receipt(quantityReceived: number, id = 'gr1'): GoodsReceipt {
    return {
      id, created_at: '', updated_at: '',
      purchase_order_id: 'po1', project_id: 'p1',
      received_date: '2026-08-01', received_by: 'u1', challan_path: null, note: null,
      items: [{
        id: `${id}-i`, created_at: '', updated_at: '',
        goods_receipt_id: id, purchase_order_item_id: 'poi1',
        quantity_received: quantityReceived,
      }],
    };
  }

  it('is the ordered quantity when nothing has arrived', () => {
    expect(calculatePendingQuantity(item, [])).toBe(400);
  });

  it('subtracts every receipt raised against the order', () => {
    expect(calculatePendingQuantity(item, [receipt(260), receipt(40, 'gr2')])).toBe(100);
  });

  it('never goes below zero on an over-delivery', () => {
    expect(calculatePendingQuantity(item, [receipt(500)])).toBe(0);
  });
});
