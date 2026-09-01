import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, type TaskInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslate } from '@/contexts/I18nContext';
import { useCompany } from '@/contexts/CompanyContext';
import { PRIORITIES, TASK_STATUSES } from '@/types/enums';
import type { Task } from '@/types/domain';
import { useSaveTask } from '../hooks/useTasks';

/**
 * Create and edit a task.
 * A task can be assigned to a user or, for a subcontractor who is not an app
 * user, to a plain name. Contractors are data objects, not logins.
 */
export function TaskFormDialog({
  open, onClose, projectId, task,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  task?: Task;
}) {
  const t = useTranslate();
  const { activeMembers } = useCompany();
  const save = useSaveTask(projectId, task?.id);

  const { register, handleSubmit, reset, formState } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '', description: '', assignee_profile_id: null, assignee_name_text: '',
      start_date: '', due_date: '', priority: 'medium', status: 'created', progress_pct: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      assignee_profile_id: task?.assignee_profile_id ?? null,
      assignee_name_text: task?.assignee_name_text ?? '',
      start_date: task?.start_date ?? '',
      due_date: task?.due_date ?? '',
      priority: task?.priority ?? 'medium',
      status: task?.status ?? 'created',
      progress_pct: task?.progress_pct ?? 0,
    });
  }, [open, task, reset]);

  /** Saves the task and closes the dialog. */
  const onSubmit = handleSubmit(async (values) => {
    await save.mutateAsync(values);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? t('tasks.edit') : t('tasks.create')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <AsyncButton onClick={onSubmit}>{t('common.save')}</AsyncButton>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input
          label={t('common.title')}
          required
          wrapperClassName="sm:col-span-2"
          error={formState.errors.title?.message}
          {...register('title')}
        />
        <div className="sm:col-span-2">
          <Textarea label={t('common.description')} {...register('description')} />
        </div>
        <Select
          label={t('common.assignee')}
          placeholder={t('common.none')}
          options={activeMembers.map((member) => ({
            value: member.profile_id,
            label: member.profile?.full_name ?? '',
          }))}
          {...register('assignee_profile_id')}
        />
        <Input
          label={t('tasks.assignToText')}
          hint={t('common.optional')}
          {...register('assignee_name_text')}
        />
        <Select
          label={t('common.priority')}
          options={PRIORITIES.map((priority) => ({ value: priority, label: t(`status.${priority}`) }))}
          {...register('priority')}
        />
        <Select
          label={t('common.status')}
          options={TASK_STATUSES.map((status) => ({ value: status, label: t(`tasks.status.${status}`) }))}
          {...register('status')}
        />
        <Input label={t('common.startDate')} type="date" {...register('start_date')} />
        <Input
          label={t('common.dueDate')}
          type="date"
          error={formState.errors.due_date?.message}
          {...register('due_date')}
        />
        <Input
          label={t('tasks.progress')}
          type="number"
          min={0}
          max={100}
          step={5}
          {...register('progress_pct')}
        />
      </form>
    </Dialog>
  );
}
