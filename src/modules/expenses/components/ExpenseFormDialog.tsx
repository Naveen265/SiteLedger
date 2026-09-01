import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseSchema, type ExpenseInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PhotoUploader, type UploadedPhoto } from '@/components/patterns/PhotoUploader';
import { useTranslate } from '@/contexts/I18nContext';
import { todayIso } from '@/lib/format/date';
import { EXPENSE_CATEGORIES } from '@/types/enums';
import { useCreateExpense } from '../hooks/useExpenses';

/** Log money spent on site, with its receipt photo. */
export function ExpenseFormDialog({
  open, onClose, projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const t = useTranslate();
  const create = useCreateExpense(projectId);
  const [receipt, setReceipt] = useState<UploadedPhoto[]>([]);

  const { register, handleSubmit, reset, formState } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { amount_rupees: 0, category: 'misc', spent_on: todayIso(), note: '' },
  });

  /** Submits the expense with its receipt path. */
  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync({ input: values, receiptPath: receipt[0]?.path ?? null });
    reset();
    setReceipt([]);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('expenses.add')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <AsyncButton onClick={onSubmit}>{t('common.submit')}</AsyncButton>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('common.amount')}
          type="number"
          min={0}
          step={1}
          required
          error={formState.errors.amount_rupees?.message}
          {...register('amount_rupees')}
        />
        <Select
          label={t('common.category')}
          options={EXPENSE_CATEGORIES.map((category) => ({
            value: category, label: t(`expenses.category.${category}`),
          }))}
          {...register('category')}
        />
        <Input
          label={t('expenses.spentOn')}
          type="date"
          max={todayIso()}
          required
          {...register('spent_on')}
        />
        <PhotoUploader
          bucket="expense-receipts"
          scope="expenses"
          label={t('expenses.receipt')}
          value={receipt}
          onChange={setReceipt}
          max={1}
        />
        <Textarea label={t('common.note')} rows={2} {...register('note')} />
      </form>
    </Dialog>
  );
}
