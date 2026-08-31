import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { projectSchema, type ProjectInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useTranslate } from '@/contexts/I18nContext';
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/types/enums';
import { paiseToRupees } from '@/lib/format/currency';
import { useSaveProject } from '../hooks/useProjects';
import type { Project } from '@/types/domain';

/**
 * Create and edit a project.
 * The budget is deliberately optional: a firm that has not agreed one yet must
 * not be blocked from creating the project.
 */
export function ProjectFormDialog({
  open, onClose, project, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  onSaved?: (project: Project) => void;
}) {
  const t = useTranslate();
  const save = useSaveProject(project?.id);

  const { register, handleSubmit, reset, formState } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '', code: '', type: null, client_name: '', address: '',
      start_date: '', planned_end_date: '', status: 'planning',
      budget_rupees: null, description: '',
    },
  });

  // Load the project into the form each time the dialog opens for editing.
  useEffect(() => {
    if (!open) return;
    reset({
      name: project?.name ?? '',
      code: project?.code ?? '',
      type: project?.type ?? null,
      client_name: project?.client_name ?? '',
      address: project?.address ?? '',
      start_date: project?.start_date ?? '',
      planned_end_date: project?.planned_end_date ?? '',
      status: project?.status ?? 'planning',
      budget_rupees: project?.budget_paise ? paiseToRupees(project.budget_paise) : null,
      description: project?.description ?? '',
    });
  }, [open, project, reset]);

  /** Saves and hands the stored row back to the caller. */
  const onSubmit = handleSubmit(async (values) => {
    const saved = await save.mutateAsync(values);
    onSaved?.(saved);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={project ? t('projects.edit') : t('projects.create')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void onSubmit()} isLoading={save.isPending}>
            {t('common.save')}
          </Button>
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
        <Input label={t('projects.code')} error={formState.errors.code?.message} {...register('code')} />
        <Select
          label={t('projects.type')}
          placeholder={t('common.selectPlaceholder')}
          options={PROJECT_TYPES.map((type) => ({ value: type, label: type }))}
          error={formState.errors.type?.message}
          {...register('type')}
        />
        <Input label={t('projects.clientName')} {...register('client_name')} />
        <Select
          label={t('common.status')}
          options={PROJECT_STATUSES.map((status) => ({ value: status, label: t(`status.${status}`) }))}
          {...register('status')}
        />
        <Input label={t('common.startDate')} type="date" {...register('start_date')} />
        <Input
          label={t('projects.plannedEnd')}
          type="date"
          error={formState.errors.planned_end_date?.message}
          {...register('planned_end_date')}
        />
        <Input
          label={t('projects.budget')}
          type="number"
          min={0}
          step={1}
          hint={t('common.optional')}
          {...register('budget_rupees')}
        />
        <Input label={t('projects.address')} wrapperClassName="sm:col-span-2" {...register('address')} />
        <div className="sm:col-span-2">
          <Textarea label={t('common.description')} {...register('description')} />
        </div>
      </form>
    </Dialog>
  );
}
