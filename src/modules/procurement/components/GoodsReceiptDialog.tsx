import { useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { PhotoUploader, type UploadedPhoto } from '@/components/patterns/PhotoUploader';
import { useTranslate } from '@/contexts/I18nContext';
import { todayIso } from '@/lib/format/date';
import { formatQuantity } from '@/lib/format/number';
import { calculatePendingQuantity } from '@/lib/calc/materials';
import type { PurchaseOrder } from '@/types/domain';
import { useGoodsReceipts, useRecordGoodsReceipt } from '../hooks/useProcurement';

/**
 * Record a goods receipt.
 * Partial delivery is allowed and normal, so each line pre-fills with the
 * quantity still outstanding rather than the full ordered quantity.
 */
export function GoodsReceiptDialog({
  purchaseOrder, projectId, onClose,
}: {
  purchaseOrder: PurchaseOrder | null;
  projectId: string;
  onClose: () => void;
}) {
  const t = useTranslate();
  const receiptsQuery = useGoodsReceipts(projectId);
  const record = useRecordGoodsReceipt(projectId);

  const [receivedDate, setReceivedDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [challan, setChallan] = useState<UploadedPhoto[]>([]);
  // Each line defaults to what is still outstanding on the order, derived from
  // the receipts rather than copied into state, so it is never stale.
  const pendingByItem = useMemo(() => {
    const receipts = receiptsQuery.data ?? [];
    return Object.fromEntries(
      (purchaseOrder?.items ?? []).map((item) => [
        item.id,
        calculatePendingQuantity(item, receipts),
      ]),
    );
  }, [purchaseOrder, receiptsQuery.data]);

  // Only the lines the storekeeper actually changed are held as state.
  const [edited, setEdited] = useState<Record<string, number>>({});

  /** The quantity a line should show: the edited one, or what is outstanding. */
  const quantityFor = (itemId: string) => edited[itemId] ?? pendingByItem[itemId] ?? 0;

  /** Records the receipt, which also writes the matching stock movements. */
  const submit = async () => {
    if (!purchaseOrder) return;
    await record.mutateAsync({
      purchaseOrderId: purchaseOrder.id,
      challanPath: challan[0]?.path ?? null,
      values: {
        received_date: receivedDate,
        note: note || undefined,
        items: (purchaseOrder.items ?? []).map((item) => ({
          purchase_order_item_id: item.id,
          quantity_received: quantityFor(item.id),
        })),
      },
    });
    setChallan([]);
    setNote('');
    setEdited({});
    onClose();
  };

  return (
    <Dialog
      open={Boolean(purchaseOrder)}
      onClose={onClose}
      title={t('procurement.recordGrn')}
      description={purchaseOrder?.po_number}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} isLoading={record.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      {purchaseOrder && (
        <div className="flex flex-col gap-4">
          <Input
            label={t('common.date')}
            type="date"
            value={receivedDate}
            max={todayIso()}
            onChange={(event) => setReceivedDate(event.target.value)}
            wrapperClassName="max-w-44"
          />

          <ul className="flex flex-col gap-3">
            {(purchaseOrder.items ?? []).map((item) => {
              const pending = calculatePendingQuantity(item, receiptsQuery.data ?? []);
              return (
                <li key={item.id} className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink">
                      {item.material_item?.name}
                    </p>
                    <p className="tabular text-2xs text-ink-muted">
                      {t('procurement.pendingQuantity')}: {formatQuantity(pending)}{' '}
                      {item.material_item?.unit}
                    </p>
                  </div>
                  <Input
                    label={t('procurement.receivedQuantity')}
                    type="number"
                    min={0}
                    max={pending}
                    step={0.01}
                    value={quantityFor(item.id)}
                    onChange={(event) =>
                      setEdited((current) => ({ ...current, [item.id]: Number(event.target.value) }))
                    }
                    wrapperClassName="w-28"
                  />
                </li>
              );
            })}
          </ul>

          <PhotoUploader
            bucket="challans"
            scope="challans"
            label={t('procurement.challan')}
            value={challan}
            onChange={setChallan}
            max={1}
          />

          <Textarea label={t('common.note')} rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      )}
    </Dialog>
  );
}
