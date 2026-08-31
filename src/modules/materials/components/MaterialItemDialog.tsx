import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { materialItemSchema, type MaterialItemInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useTranslate } from '@/contexts/I18nContext';
import { MATERIAL_UNITS } from '@/types/enums';
import { useSaveMaterialItem } from '../hooks/useMaterials';

/** Adds a material to the company master, with its low stock threshold. */
export function MaterialItemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslate();
  const save = useSaveMaterialItem();

  const { register, handleSubmit, reset, formState } = useForm<MaterialItemInput>({
    resolver: zodResolver(materialItemSchema),
    defaultValues: { name: '', unit: 'bag', category: '', standard_rate_rupees: null, low_stock_threshold: null },
  });

  /** Saves the item, resets the form and closes. */
  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync(values);
    reset();
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('materials.addItem')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void onSubmit()} isLoading={save.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input label={t('common.name')} required error={formState.errors.name?.message} {...register('name')} />
        <Select
          label={t('common.unit')}
          required
          options={MATERIAL_UNITS.map((unit) => ({ value: unit, label: unit }))}
          {...register('unit')}
        />
        <Input label={t('common.category')} hint={t('common.optional')} {...register('category')} />
        <Input
          label={t('procurement.rate')}
          type="number"
          min={0}
          hint={t('common.optional')}
          {...register('standard_rate_rupees')}
        />
        <Input
          label={t('materials.threshold')}
          type="number"
          min={0}
          hint={t('materials.lowStock')}
          {...register('low_stock_threshold')}
        />
      </form>
    </Dialog>
  );
}
