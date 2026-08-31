import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import { stockIssueSchema, type StockIssueInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslate } from '@/contexts/I18nContext';
import { formatQuantity } from '@/lib/format/number';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import type { StockLine } from '@/lib/calc/materials';
import { useIssueStock } from '../hooks/useMaterials';

/**
 * Issue stock from store to site.
 * Tagging the task the stock went to is what lets consumed value feed project
 * cost without anyone entering the cost a second time.
 */
export function IssueStockDialog({
  open, onClose, projectId, stock,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  stock: StockLine[];
}) {
  const t = useTranslate();
  const issue = useIssueStock(projectId);
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const tasksQuery = useTasks(routeProjectId ?? projectId);

  const { register, handleSubmit, reset, formState } = useForm<StockIssueInput>({
    resolver: zodResolver(stockIssueSchema),
    defaultValues: { material_item_id: '', quantity: 1, issued_to_task_id: null, note: '' },
  });

  /** Records the issue and closes. */
  const onSubmit = handleSubmit(async (values) => {
    await issue.mutateAsync(values);
    reset();
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('materials.issueStock')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void onSubmit()} isLoading={issue.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Select
          label={t('materials.items')}
          required
          placeholder={t('common.selectPlaceholder')}
          // The option label carries the on-hand figure, so the storekeeper
          // does not have to switch screens to check availability.
          options={stock.map((line) => ({
            value: line.material_item_id,
            label: `${line.name} (${formatQuantity(line.on_hand)} ${line.unit})`,
          }))}
          error={formState.errors.material_item_id?.message}
          {...register('material_item_id')}
        />
        <Input
          label={t('common.quantity')}
          type="number"
          min={0.01}
          step={0.01}
          required
          error={formState.errors.quantity?.message}
          {...register('quantity')}
        />
        <Select
          label={t('materials.issueTo')}
          placeholder={t('common.none')}
          options={(tasksQuery.data ?? []).map((task) => ({ value: task.id, label: task.title }))}
          {...register('issued_to_task_id')}
        />
        <Textarea label={t('common.note')} rows={2} {...register('note')} />
      </form>
    </Dialog>
  );
}
