import { useState } from 'react';
import { Camera, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusChip } from '@/components/ui/StatusChip';
import { PageHeader } from '@/components/patterns/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ListSkeleton } from '@/components/skeletons';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatRelative } from '@/lib/format/date';
import { isIssueOpen } from '@/lib/calc/issues';
import { useIssues } from '@/modules/issues/hooks/useIssues';
import { ReportIssueDialog } from '@/modules/issues/components/ReportIssueDialog';
import { IssueDetailDialog } from '@/modules/issues/components/IssueDetailDialog';

/** Issues on the site shell: report in three taps, and see what is open. */
export function SiteIssuesPage() {
  const t = useTranslate();
  const { currentProjectId } = useProject();
  const { data, isLoading } = useIssues(currentProjectId);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [openIssueId, setOpenIssueId] = useState<string | null>(null);

  const openIssues = (data ?? []).filter(isIssueOpen);

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={t('issues.title')} />

      <Button
        size="lg"
        fullWidth
        icon={<Camera className="size-5" />}
        onClick={() => setIsReportOpen(true)}
      >
        {t('issues.report')}
      </Button>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : openIssues.length === 0 ? (
        <Card>
          <EmptyState icon={<TriangleAlert className="size-6" />} message={t('issues.empty')} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {openIssues.map((issue) => (
            <li key={issue.id}>
              <button
                type="button"
                onClick={() => setOpenIssueId(issue.id)}
                className="w-full rounded-[var(--radius-card)] border border-border bg-surface p-3 text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs font-medium text-ink">{issue.title}</p>
                  <StatusChip
                    label={t(`status.${issue.priority}`)}
                    tone={issue.priority === 'critical' ? 'delayed' : issue.priority === 'high' ? 'risk' : 'neutral'}
                    size="sm"
                  />
                </div>
                <p className="mt-1 text-2xs text-ink-muted">{formatRelative(issue.created_at)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {currentProjectId && (
        <>
          <ReportIssueDialog
            open={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            projectId={currentProjectId}
          />
          <IssueDetailDialog
            issueId={openIssueId}
            projectId={currentProjectId}
            onClose={() => setOpenIssueId(null)}
          />
        </>
      )}
    </div>
  );
}
