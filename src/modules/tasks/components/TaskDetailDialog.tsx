import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { Explain } from '@/components/patterns/InfoTip';
import { PhotoUploader, type UploadedPhoto } from '@/components/patterns/PhotoUploader';
import { StoredImage } from '@/components/patterns/StoredImage';
import { FormSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { canVerifyTask } from '@/lib/calc/tasks';
import {
  useAddTaskComment, useAddTaskPhotos, useSaveTask, useTask,
  useTaskComments, useTaskPhotos, useVerifyTask,
} from '../hooks/useTasks';
import { PriorityChip, TaskStatusChip } from './TaskStatusChip';

/**
 * Task detail.
 * The verify control is only rendered for a project manager, an owner or a
 * site engineer. Row Level Security refuses the write for anyone else, so
 * hiding the button is a courtesy, not the enforcement.
 */
export function TaskDetailDialog({
  taskId, projectId, onClose,
}: {
  taskId: string | null;
  projectId: string;
  onClose: () => void;
}) {
  const t = useTranslate();
  const { user } = useAuth();
  const taskQuery = useTask(taskId);
  const commentsQuery = useTaskComments(taskId);
  const photosQuery = useTaskPhotos(taskId);
  const verify = useVerifyTask(projectId);
  const save = useSaveTask(projectId, taskId ?? undefined);
  const addComment = useAddTaskComment(taskId ?? '');
  const addPhotos = useAddTaskPhotos(taskId ?? '');

  const [commentBody, setCommentBody] = useState('');
  const [progress, setProgress] = useState<number | null>(null);

  const task = taskQuery.data;
  const canVerify = user ? canVerifyTask(user.role, user.site_level) : false;

  /** Saves the dragged progress value back to the task. */
  const saveProgress = async () => {
    if (progress === null || !task) return;
    await save.mutateAsync({
      title: task.title,
      description: task.description ?? undefined,
      assignee_profile_id: task.assignee_profile_id,
      assignee_name_text: task.assignee_name_text ?? undefined,
      start_date: task.start_date ?? undefined,
      due_date: task.due_date ?? undefined,
      priority: task.priority,
      status: progress >= 100 ? 'completed' : 'in_progress',
      progress_pct: progress,
    });
    setProgress(null);
  };

  return (
    <Dialog
      open={Boolean(taskId)}
      onClose={onClose}
      title={task?.title ?? t('nav.tasks')}
      footer={
        task && (
          <>
            {progress !== null && (
              <Button variant="secondary" onClick={() => void saveProgress()} isLoading={save.isPending}>
                {t('common.save')}
              </Button>
            )}
            {canVerify && task.status !== 'verified' && (
              <Button
                icon={<CheckCircle2 className="size-4" />}
                onClick={() => verify.mutate(task.id)}
                isLoading={verify.isPending}
              >
                {t('tasks.verify')}
              </Button>
            )}
          </>
        )
      }
    >
      {taskQuery.isLoading || !task ? (
        <FormSkeleton fields={4} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <TaskStatusChip status={task.status} size="md" />
            <PriorityChip priority={task.priority} size="md" />
            {task.status === 'verified' && (
              <span className="flex items-center gap-1 text-2xs text-ink-muted">
                {t('tasks.verifiedBy')} {formatDateTime(task.verified_at)}
                <Explain name="verified" withFormula={false} />
              </span>
            )}
          </div>

          {task.description && (
            <p className="measure text-xs text-ink-muted">{task.description}</p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-2xs">
            <div>
              <dt className="text-ink-muted">{t('common.assignee')}</dt>
              <dd className="mt-0.5 text-ink">
                {task.assignee?.full_name ?? task.assignee_name_text ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t('common.dueDate')}</dt>
              <dd className="mt-0.5 text-ink">{task.due_date ? formatDate(task.due_date) : '-'}</dd>
            </div>
          </dl>

          <div>
            <label htmlFor="task-progress" className="text-xs font-medium text-ink">
              {t('tasks.progress')}
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="task-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress ?? task.progress_pct}
                onChange={(event) => setProgress(Number(event.target.value))}
                className="h-11 flex-1 accent-[var(--color-primary)]"
              />
              <span className="tabular w-12 text-right text-sm font-semibold text-ink">
                {progress ?? task.progress_pct}%
              </span>
            </div>
            <Progress value={progress ?? task.progress_pct} showLabel={false} className="mt-1" />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink">{t('common.photos')}</p>
            {(photosQuery.data ?? []).length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {(photosQuery.data ?? []).map((photo) => (
                  <StoredImage
                    key={photo.id}
                    bucket="task-photos"
                    path={photo.storage_path}
                    alt={task.title}
                    className="size-20 rounded-[var(--radius-control)] border border-border"
                  />
                ))}
              </div>
            )}
            <PhotoUploader
              bucket="task-photos"
              scope="tasks"
              value={[]}
              onChange={(photos: UploadedPhoto[]) =>
                addPhotos.mutate(photos.map((photo) => photo.path))
              }
              max={4}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink">{t('common.comments')}</p>
            <ul className="mb-3 flex flex-col gap-3">
              {(commentsQuery.data ?? []).map((comment) => (
                <li key={comment.id} className="flex gap-2.5">
                  <Avatar name={comment.author?.full_name ?? ''} size="sm" />
                  <div className="min-w-0">
                    <p className="text-2xs font-medium text-ink">
                      {comment.author?.full_name}
                      <span className="ml-2 font-normal text-ink-faint">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </p>
                    <p className="measure mt-0.5 text-xs text-ink-muted">{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-end gap-2">
              <Textarea
                label={t('common.addComment')}
                rows={2}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
              />
              <Button
                icon={<Send className="size-4" />}
                disabled={!commentBody.trim()}
                onClick={() => {
                  addComment.mutate(commentBody);
                  setCommentBody('');
                }}
              >
                {t('common.addComment')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
