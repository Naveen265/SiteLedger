import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { issueSchema, type IssueInput } from '@/lib/validation';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PhotoUploader, type UploadedPhoto } from '@/components/patterns/PhotoUploader';
import { useCompany } from '@/contexts/CompanyContext';
import { useTranslate } from '@/contexts/I18nContext';
import { PRIORITIES } from '@/types/enums';
import { useCreateIssue } from '../hooks/useIssues';

/**
 * Report an issue in about three taps.
 * The photo comes first because that is what a site user reaches for, and the
 * project, the site and the reporter are all derived rather than asked for.
 */
export function ReportIssueDialog({
  open, onClose, projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const t = useTranslate();
  const { activeMembers } = useCompany();
  const create = useCreateIssue(projectId);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const { register, handleSubmit, reset, formState } = useForm<IssueInput>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: '', description: '', area: '', priority: 'medium',
      assignee_profile_id: null, due_date: '',
    },
  });

  /** Creates the issue with the photos already uploaded. */
  const onSubmit = handleSubmit(async (values) => {
    await create.mutateAsync({ input: values, photoPaths: photos.map((photo) => photo.path) });
    reset();
    setPhotos([]);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('issues.report')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <AsyncButton size="lg" onClick={onSubmit}>
            {t('common.submit')}
          </AsyncButton>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {/* Tap one: the photo. */}
        <PhotoUploader
          bucket="issue-photos"
          scope="issues"
          label={t('common.photos')}
          value={photos}
          onChange={setPhotos}
          max={4}
        />

        {/* Tap two: what is wrong. */}
        <Input
          label={t('common.title')}
          required
          error={formState.errors.title?.message}
          {...register('title')}
        />

        {/* Tap three: how urgent. */}
        <Select
          label={t('common.priority')}
          options={PRIORITIES.map((priority) => ({ value: priority, label: t(`status.${priority}`) }))}
          {...register('priority')}
        />

        <Textarea label={t('common.description')} rows={2} {...register('description')} />
        <Input label={t('issues.area')} hint={t('common.optional')} {...register('area')} />
        <Select
          label={t('common.assignee')}
          placeholder={t('common.none')}
          options={activeMembers.map((member) => ({
            value: member.profile_id,
            label: member.profile?.full_name ?? '',
          }))}
          {...register('assignee_profile_id')}
        />
        <Input label={t('common.dueDate')} type="date" {...register('due_date')} />
      </form>
    </Dialog>
  );
}
