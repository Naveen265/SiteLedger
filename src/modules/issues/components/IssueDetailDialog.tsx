import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Avatar } from '@/components/ui/Avatar';
import { StatusChip } from '@/components/ui/StatusChip';
import { StoredImage } from '@/components/patterns/StoredImage';
import { PhotoUploader, type UploadedPhoto } from '@/components/patterns/PhotoUploader';
import { ListSkeleton } from '@/components/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { formatDateTime } from '@/lib/format/date';
import { isIssueEscalated } from '@/lib/calc/issues';
import {
  useAddIssueComment, useCloseIssue, useIssue, useIssueComments, useResolveIssue,
} from '../hooks/useIssues';

/**
 * Issue detail.
 * Resolving requires an evidence photo, because a resolution with no proof is
 * how an issue quietly reopens a week later.
 */
export function IssueDetailDialog({
  issueId, projectId, onClose,
}: {
  issueId: string | null;
  projectId: string;
  onClose: () => void;
}) {
  const t = useTranslate();
  const { can } = useAuth();
  const { notify } = useToast();
  const issueQuery = useIssue(issueId);
  const commentsQuery = useIssueComments(issueId);
  const resolve = useResolveIssue(projectId, issueId ?? '');
  const close = useCloseIssue(projectId, issueId ?? '');
  const addComment = useAddIssueComment(issueId ?? '');

  const [resolutionNote, setResolutionNote] = useState('');
  const [evidence, setEvidence] = useState<UploadedPhoto[]>([]);
  const [commentBody, setCommentBody] = useState('');

  const issue = issueQuery.data;

  /** Resolves the issue, refusing without evidence. */
  const submitResolution = async () => {
    if (evidence.length === 0) {
      notify(t('issues.evidenceRequired'), 'error');
      return;
    }
    await resolve.mutateAsync({ note: resolutionNote, evidencePath: evidence[0].path });
    setResolutionNote('');
    setEvidence([]);
  };

  return (
    <Dialog
      open={Boolean(issueId)}
      onClose={onClose}
      title={issue?.title ?? t('issues.title')}
      footer={
        issue && (
          <>
            {issue.status === 'resolved' && can('issue.close') && (
              <Button onClick={() => close.mutate()} isLoading={close.isPending}>
                {t('issues.status.closed')}
              </Button>
            )}
            {issue.status !== 'resolved' && issue.status !== 'closed' && can('issue.resolve') && (
              <Button
                icon={<CheckCircle2 className="size-4" />}
                onClick={() => void submitResolution()}
                isLoading={resolve.isPending}
              >
                {t('issues.status.resolved')}
              </Button>
            )}
          </>
        )
      }
    >
      {issueQuery.isLoading || !issue ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip
              label={t(`issues.status.${issue.status}`)}
              tone={issue.status === 'open' ? 'delayed' : issue.status === 'resolved' ? 'ontrack' : 'risk'}
            />
            <StatusChip
              label={t(`status.${issue.priority}`)}
              tone={issue.priority === 'critical' ? 'delayed' : issue.priority === 'high' ? 'risk' : 'neutral'}
            />
            {isIssueEscalated(issue) && <StatusChip label={t('issues.escalated')} tone="delayed" />}
          </div>

          {issue.description && <p className="measure text-xs text-ink-muted">{issue.description}</p>}

          {(issue.photos ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(issue.photos ?? []).map((photo) => (
                <StoredImage
                  key={photo.id}
                  bucket="issue-photos"
                  path={photo.storage_path}
                  alt={issue.title}
                  className="size-24 rounded-[var(--radius-control)] border border-border"
                />
              ))}
            </div>
          )}

          {issue.status !== 'resolved' && issue.status !== 'closed' && can('issue.resolve') && (
            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border p-3">
              <Textarea
                label={t('issues.resolutionNote')}
                rows={2}
                value={resolutionNote}
                onChange={(event) => setResolutionNote(event.target.value)}
              />
              <PhotoUploader
                bucket="issue-photos"
                scope="issues/evidence"
                label={t('issues.evidencePhoto')}
                value={evidence}
                onChange={setEvidence}
                max={1}
              />
            </div>
          )}

          {issue.resolution_note && (
            <div className="rounded-[var(--radius-control)] bg-surface-subtle p-3">
              <p className="text-2xs font-medium text-ink">{t('issues.resolutionNote')}</p>
              <p className="measure mt-1 text-xs text-ink-muted">{issue.resolution_note}</p>
            </div>
          )}

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
                onClick={() => { addComment.mutate(commentBody); setCommentBody(''); }}
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
