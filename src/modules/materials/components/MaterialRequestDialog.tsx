import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Explain } from '@/components/patterns/InfoTip';
import { useTranslate } from '@/contexts/I18nContext';
import { MATERIAL_UNITS } from '@/types/enums';
import { newId } from '@/lib/utils/id';
import { useCreateMaterialRequest, useMaterialItems } from '../hooks/useMaterials';

type Line = { key: string; materialItemId: string; quantity: number; unit: string };

/**
 * Raise a material request from site.
 * This request is the single record that threads through approval, purchase
 * order and goods receipt. Nobody downstream retypes it.
 */
export function MaterialRequestDialog({
  open, onClose, projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const t = useTranslate();
  const itemsQuery = useMaterialItems();
  const create = useCreateMaterialRequest(projectId);

  const [lines, setLines] = useState<Line[]>([
    { key: newId(), materialItemId: '', quantity: 1, unit: 'bag' },
  ]);
  const [neededBy, setNeededBy] = useState('');
  const [note, setNote] = useState('');

  /** Adds an empty line to the request. */
  const addLine = () =>
    setLines((current) => [...current, { key: newId(), materialItemId: '', quantity: 1, unit: 'bag' }]);

  /** Removes one line, keeping at least one on screen. */
  const removeLine = (key: string) =>
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.key !== key)));

  /** Updates one field on one line. */
  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  /** Submits the request and resets the form. */
  const submit = async () => {
    await create.mutateAsync({
      needed_by: neededBy || undefined,
      note: note || undefined,
      items: lines
        .filter((line) => line.materialItemId)
        .map((line) => ({
          material_item_id: line.materialItemId,
          free_text_name: undefined,
          quantity: line.quantity,
          unit: line.unit,
        })),
    });
    setLines([{ key: newId(), materialItemId: '', quantity: 1, unit: 'bag' }]);
    setNeededBy('');
    setNote('');
    onClose();
  };

  const itemOptions = (itemsQuery.data ?? []).map((item) => ({ value: item.id, label: item.name }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('materials.newRequest')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} isLoading={create.isPending}>{t('common.submit')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {lines.map((line) => (
          <div key={line.key} className="flex items-end gap-2">
            <Select
              label={t('materials.items')}
              placeholder={t('common.selectPlaceholder')}
              options={itemOptions}
              value={line.materialItemId}
              onChange={(event) => updateLine(line.key, { materialItemId: event.target.value })}
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
            <Select
              label={t('common.unit')}
              options={MATERIAL_UNITS.map((unit) => ({ value: unit, label: unit }))}
              value={line.unit}
              onChange={(event) => updateLine(line.key, { unit: event.target.value })}
              wrapperClassName="w-24"
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

        <Input
          label={t('materials.neededBy')}
          type="date"
          value={neededBy}
          onChange={(event) => setNeededBy(event.target.value)}
          adornment={<Explain name="neededBy" withFormula={false} />}
        />

        <Textarea label={t('common.note')} value={note} onChange={(event) => setNote(event.target.value)} />
      </div>
    </Dialog>
  );
}
