import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslate } from '@/contexts/I18nContext';
import { formatPaise, rupeesToPaise } from '@/lib/format/currency';
import { newId } from '@/lib/utils/id';
import { EWAY_BILL_THRESHOLD_PAISE } from '@/config/constants';
import { useMaterialItems } from '@/modules/materials/hooks/useMaterials';
import { useCreatePurchaseOrder, useVendors } from '../hooks/useProcurement';

type Line = { key: string; materialItemId: string; quantity: number; rateRupees: number; gstPct: number };

/**
 * Create a purchase order.
 * GST percent and the vendor GSTIN are captured so exported values are right.
 * When the consignment value passes fifty thousand rupees the screen shows a
 * passive reminder that an e-way bill is likely needed. It does not generate one.
 */
export function PurchaseOrderDialog({
  open, onClose, projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const t = useTranslate();
  const vendorsQuery = useVendors();
  const itemsQuery = useMaterialItems();
  const create = useCreatePurchaseOrder(projectId);

  const [vendorId, setVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { key: newId(), materialItemId: '', quantity: 1, rateRupees: 0, gstPct: 18 },
  ]);

  /** Adds an order line. */
  const addLine = () =>
    setLines((current) => [
      ...current,
      { key: newId(), materialItemId: '', quantity: 1, rateRupees: 0, gstPct: 18 },
    ]);

  /** Removes an order line, keeping at least one. */
  const removeLine = (key: string) =>
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));

  /** Updates one field on one line. */
  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  // The order total drives both the e-way bill reminder and the approval route.
  const totalPaise = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Math.round(line.quantity * rupeesToPaise(line.rateRupees) * (1 + line.gstPct / 100)),
        0,
      ),
    [lines],
  );

  /** Creates the order and resets the form. */
  const submit = async () => {
    await create.mutateAsync({
      vendor_id: vendorId,
      expected_date: expectedDate || undefined,
      notes: notes || undefined,
      items: lines
        .filter((line) => line.materialItemId)
        .map((line) => ({
          material_item_id: line.materialItemId,
          quantity: line.quantity,
          rate_rupees: line.rateRupees,
          gst_pct: line.gstPct,
        })),
    });
    setLines([{ key: newId(), materialItemId: '', quantity: 1, rateRupees: 0, gstPct: 18 }]);
    setVendorId('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('procurement.createPo')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} isLoading={create.isPending} disabled={!vendorId}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('common.vendor')}
            required
            placeholder={t('common.selectPlaceholder')}
            options={(vendorsQuery.data ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name }))}
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
          />
          <Input
            label={t('procurement.expectedDate')}
            type="date"
            value={expectedDate}
            onChange={(event) => setExpectedDate(event.target.value)}
          />
        </div>

        {lines.map((line) => (
          <div key={line.key} className="flex flex-wrap items-end gap-2">
            <Select
              label={t('materials.items')}
              placeholder={t('common.selectPlaceholder')}
              options={(itemsQuery.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
              value={line.materialItemId}
              onChange={(event) => updateLine(line.key, { materialItemId: event.target.value })}
              wrapperClassName="min-w-40 flex-1"
            />
            <Input
              label={t('common.quantity')}
              type="number"
              min={0.01}
              step={0.01}
              value={line.quantity}
              onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })}
              wrapperClassName="w-24"
            />
            <Input
              label={t('procurement.rate')}
              type="number"
              min={0}
              step={0.01}
              value={line.rateRupees}
              onChange={(event) => updateLine(line.key, { rateRupees: Number(event.target.value) })}
              wrapperClassName="w-28"
            />
            <Input
              label={t('procurement.gstPct')}
              type="number"
              min={0}
              max={100}
              value={line.gstPct}
              onChange={(event) => updateLine(line.key, { gstPct: Number(event.target.value) })}
              wrapperClassName="w-20"
            />
            <IconButton
              label={t('common.delete')}
              icon={<Trash2 className="size-4" />}
              onClick={() => removeLine(line.key)}
            />
          </div>
        ))}

        <Button variant="ghost" size="sm" icon={<Plus className="size-3.5" />} onClick={addLine}>
          {t('common.add')}
        </Button>

        <Textarea label={t('common.notes')} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs font-medium text-ink">{t('common.total')}</span>
          <span className="tabular text-sm font-semibold text-ink">{formatPaise(totalPaise)}</span>
        </div>

        {totalPaise > EWAY_BILL_THRESHOLD_PAISE && (
          <p className="flex items-start gap-2 rounded-[var(--radius-control)] bg-[color-mix(in_srgb,var(--color-status-risk)_10%,white)] p-2.5 text-2xs text-ink">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-status-risk" aria-hidden />
            {t('procurement.ewayReminder')}
          </p>
        )}
      </div>
    </Dialog>
  );
}
