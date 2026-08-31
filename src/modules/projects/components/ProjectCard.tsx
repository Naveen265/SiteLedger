import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { routes } from '@/config/routes';
import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import { Progress } from '@/components/ui/Progress';
import { useTranslate } from '@/contexts/I18nContext';
import { formatRelative } from '@/lib/format/date';
import type { ProjectHealth } from '@/lib/calc/progress';
import type { Project } from '@/types/domain';

/** Maps a health verdict to the chip tone that carries its colour. */
const HEALTH_TONE: Record<ProjectHealth, StatusTone> = {
  on_track: 'ontrack',
  at_risk: 'risk',
  delayed: 'delayed',
};

/**
 * One project in the list.
 * Shows the four things a project manager scans for: name, health, progress
 * and how many issues are open.
 */
export function ProjectCard({
  project, progressPct, health, openIssueCount, className,
}: {
  project: Project;
  progressPct: number;
  health: ProjectHealth;
  openIssueCount: number;
  className?: string;
}) {
  const t = useTranslate();

  return (
    <Link
      to={routes.projectDashboard(project.id)}
      className={cn(
        'block rounded-[var(--radius-card)] border border-border bg-surface p-4',
        'transition-colors duration-150 hover:border-border-strong',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{project.name}</h3>
          {project.code && <p className="mt-0.5 text-2xs text-ink-faint">{project.code}</p>}
        </div>
        <StatusChip label={t(`status.${health}`)} tone={HEALTH_TONE[health]} size="sm" />
      </div>

      {project.client_name && (
        <p className="mt-2 truncate text-2xs text-ink-muted">{project.client_name}</p>
      )}

      <div className="mt-4">
        <Progress value={progressPct} tone={health === 'delayed' ? 'delayed' : 'primary'} />
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-2xs">
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">{t('projects.openIssues')}</dt>
          <dd className="tabular font-medium text-ink">{openIssueCount}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">{t('projects.lastActivity')}</dt>
          <dd className="font-medium text-ink">{formatRelative(project.updated_at)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-ink-muted">{t('common.status')}</dt>
          <dd className="font-medium text-ink">{t(`status.${project.status}`)}</dd>
        </div>
      </dl>
    </Link>
  );
}
