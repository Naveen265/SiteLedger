import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { assetSchema, type AssetInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Explain } from '@/components/patterns/InfoTip';
import { useTranslate } from '@/contexts/I18nContext';
import { ASSET_OWNERSHIPS, ASSET_TYPES } from '@/types/enums';
import { DEFAULT_IDLE_THRESHOLD_DAYS } from '@/config/constants';
import { paiseToRupees } from '@/lib/format/currency';
import type { Asset } from '@/types/domain';
import { useVendors } from '@/modules/procurement/hooks/useProcurement';
import { useSaveAsset } from '../hooks/useEquipment';

/**
 * Create and edit an asset.
 * A reusable set is tracked as one object with a quantity, not as individual
 * clamps or panels, because counting clamps is what produces a register nobody
 * keeps up to date.
 */
export function AssetFormDialog({
  open, onClose, asset,
}: {
  open: boolean;
  onClose: () => void;
  asset?: Asset;
}) {
  const t = useTranslate();
  const save = useSaveAsset(asset?.id);
  const vendorsQuery = useVendors();

  const { register, handleSubmit, reset, watch, formState } = useForm<AssetInput>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: '', asset_type: 'machine', ownership: 'owned', identifier: '',
      set_quantity: null, purchase_value_rupees: null, rental_vendor_id: null,
      rental_start_date: '', rental_due_date: '', rental_rate_rupees: null,
      idle_threshold_days: DEFAULT_IDLE_THRESHOLD_DAYS,
    },
  });

  const assetType = watch('asset_type');
  const ownership = watch('ownership');

  useEffect(() => {
    if (!open) return;
    reset({
      name: asset?.name ?? '',
      asset_type: asset?.asset_type ?? 'machine',
      ownership: asset?.ownership ?? 'owned',
      identifier: asset?.identifier ?? '',
      set_quantity: asset?.set_quantity ?? null,
      purchase_value_rupees: asset?.purchase_value_paise ? paiseToRupees(asset.purchase_value_paise) : null,
      rental_vendor_id: asset?.rental_vendor_id ?? null,
      rental_start_date: asset?.rental_start_date ?? '',
      rental_due_date: asset?.rental_due_date ?? '',
      rental_rate_rupees: asset?.rental_rate_paise ? paiseToRupees(asset.rental_rate_paise) : null,
      idle_threshold_days: asset?.idle_threshold_days ?? DEFAULT_IDLE_THRESHOLD_DAYS,
    });
  }, [open, asset, reset]);

  /** Saves the asset and closes. */
  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync(values);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={asset ? t('equipment.editAsset') : t('equipment.addAsset')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <AsyncButton onClick={onSubmit}>{t('common.save')}</AsyncButton>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label={t('common.name')}
          required
          wrapperClassName="sm:col-span-2"
          error={formState.errors.name?.message}
          {...register('name')}
        />
        <Select
          label={t('equipment.assetType')}
          options={ASSET_TYPES.map((type) => ({ value: type, label: t(`equipment.type.${type}`) }))}
          adornment={assetType === 'reusable_set' ? <Explain name="reusableSet" withFormula={false} /> : undefined}
          {...register('asset_type')}
        />
        <Select
          label={t('equipment.ownership')}
          options={ASSET_OWNERSHIPS.map((own) => ({ value: own, label: t(`equipment.own.${own}`) }))}
          {...register('ownership')}
        />
        <Input label={t('equipment.identifier')} {...register('identifier')} />

        {/* A reusable set is one tracked object carrying a quantity. */}
        {assetType === 'reusable_set' && (
          <Input
            label={t('equipment.setQuantity')}
            type="number"
            min={1}
            required
            error={formState.errors.set_quantity?.message}
            {...register('set_quantity')}
          />
        )}

        {ownership === 'owned' ? (
          <Input
            label={t('projects.budget')}
            type="number"
            min={0}
            hint={t('common.optional')}
            {...register('purchase_value_rupees')}
          />
        ) : (
          <>
            <Select
              label={t('equipment.rentalVendor')}
              placeholder={t('common.selectPlaceholder')}
              options={(vendorsQuery.data ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name }))}
              {...register('rental_vendor_id')}
            />
            <Input label={t('common.startDate')} type="date" {...register('rental_start_date')} />
            <Input
              label={t('equipment.rentalDue')}
              type="date"
              required
              error={formState.errors.rental_due_date?.message}
              {...register('rental_due_date')}
            />
            <Input
              label={t('equipment.rentalRate')}
              type="number"
              min={0}
              {...register('rental_rate_rupees')}
            />
          </>
        )}

        <Input
          label={t('equipment.idleDays')}
          type="number"
          min={1}
          max={365}
          hint={t('equipment.idleAlert')}
          {...register('idle_threshold_days')}
        />
      </form>
    </Dialog>
  );
}
