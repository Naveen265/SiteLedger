import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { workerSchema, type WorkerInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useTranslate } from '@/contexts/I18nContext';
import { WORKER_CATEGORIES } from '@/types/enums';
import { paiseToRupees } from '@/lib/format/currency';
import { useContractors, useSaveWorker } from '../hooks/useLabour';
import type { Worker } from '@/types/domain';

/**
 * Create and edit a worker.
 * The daily rate is required, because without it the wage calculation cannot
 * run and attendance alone is a muster roll nobody switches software for.
 */
export function WorkerFormDialog({
  open, onClose, worker,
}: {
  open: boolean;
  onClose: () => void;
  worker?: Worker;
}) {
  const t = useTranslate();
  const save = useSaveWorker(worker?.id);
  const contractorsQuery = useContractors();

  const { register, handleSubmit, reset, formState } = useForm<WorkerInput>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      full_name: '', phone: '', category: 'unskilled', daily_rate_rupees: 0, contractor_id: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      full_name: worker?.full_name ?? '',
      phone: worker?.phone ?? '',
      category: worker?.category ?? 'unskilled',
      daily_rate_rupees: worker ? paiseToRupees(worker.daily_rate_paise) : 0,
      contractor_id: worker?.contractor_id ?? null,
    });
  }, [open, worker, reset]);

  /** Saves the worker and closes the dialog. */
  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync(values);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={worker ? t('labour.editWorker') : t('labour.addWorker')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <AsyncButton onClick={onSubmit}>
            {t('common.save')}
          </AsyncButton>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('common.name')}
          required
          error={formState.errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label={t('common.phone')}
          type="tel"
          inputMode="numeric"
          hint={t('common.optional')}
          error={formState.errors.phone?.message}
          {...register('phone')}
        />
        <Select
          label={t('labour.workerCategory')}
          required
          options={WORKER_CATEGORIES.map((category) => ({ value: category, label: category }))}
          error={formState.errors.category?.message}
          {...register('category')}
        />
        <Input
          label={t('labour.dailyRate')}
          type="number"
          min={0}
          step={1}
          required
          error={formState.errors.daily_rate_rupees?.message}
          {...register('daily_rate_rupees')}
        />
        <Select
          label={t('labour.contractor')}
          placeholder={t('common.none')}
          options={(contractorsQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          {...register('contractor_id')}
        />
      </form>
    </Dialog>
  );
}
