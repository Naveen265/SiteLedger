import { ISSUE_AGE_BUCKETS } from '@/config/constants';
import { daysBetween } from '@/lib/format/date';
import type { Issue } from '@/types/domain';

/** Issue derivations: ageing buckets and escalation. */

/** An issue is open until it is resolved or closed. */
export function isIssueOpen(issue: Issue): boolean {
  return issue.status !== 'resolved' && issue.status !== 'closed';
}

/**
 * Groups open issues by how many days since they were raised.
 * Resolved and closed issues are excluded, because ageing is about backlog.
 */
export function calculateIssueAgeing(
  issues: Issue[],
): Array<{ bucket: string; count: number }> {
  const open = issues.filter(isIssueOpen);
  return ISSUE_AGE_BUCKETS.map((bucket) => ({
    bucket: bucket.key,
    count: open.filter((issue) => {
      const age = daysBetween(issue.created_at);
      return age >= bucket.min && age <= bucket.max;
    }).length,
  }));
}

/**
 * An unresolved high or critical issue past its due date escalates to the
 * project manager and the owner, and raises the project risk flag.
 */
export function isIssueEscalated(issue: Issue, now: Date = new Date()): boolean {
  if (!isIssueOpen(issue)) return false;
  if (issue.priority !== 'high' && issue.priority !== 'critical') return false;
  if (!issue.due_date) return false;
  return new Date(issue.due_date) < now;
}

/** Open issues at high or critical priority, which drive the risk flag. */
export function countCriticalOpenIssues(issues: Issue[]): number {
  return issues.filter(
    (issue) => isIssueOpen(issue) && (issue.priority === 'critical' || issue.priority === 'high'),
  ).length;
}
