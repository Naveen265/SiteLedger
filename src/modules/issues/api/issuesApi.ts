import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { nullIfEmpty, type IssueInput } from '@/lib/validation';
import type { Issue, IssueComment } from '@/types/domain';

/**
 * Issue reads and writes.
 * Reporting is three taps: the photo, the description and the priority. Every
 * other field is derived from the project and the person reporting.
 */

const ISSUE_SELECT =
  '*, assignee:profiles!issues_assignee_profile_id_fkey(*), raiser:profiles!issues_raised_by_fkey(*), photos:issue_photos(*)';

/** Lists every issue on a project, newest first. */
export async function fetchIssues(projectId: string): Promise<Issue[]> {
  return unwrap(
    await supabase
      .from('issues')
      .select(ISSUE_SELECT)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ) as Issue[];
}

/** Lists issues across several projects, for the owner portfolio view. */
export async function fetchIssuesForProjects(projectIds: string[]): Promise<Issue[]> {
  if (projectIds.length === 0) return [];
  return unwrap(
    await supabase
      .from('issues')
      .select('*, project:projects(id, name)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false }),
  ) as Issue[];
}

/** Reads one issue with its photos and people. */
export async function fetchIssue(issueId: string): Promise<Issue> {
  return unwrap(
    await supabase.from('issues').select(ISSUE_SELECT).eq('id', issueId).single(),
  ) as Issue;
}

/** Maps form values onto the row shape, turning empty strings into null. */
function toIssueRow(input: Partial<IssueInput>) {
  return {
    ...input,
    description: nullIfEmpty(input.description),
    area: nullIfEmpty(input.area),
    due_date: nullIfEmpty(input.due_date),
    assignee_profile_id: input.assignee_profile_id || null,
  };
}

/** Creates an issue and attaches the photos captured with it. */
export async function createIssue(
  input: IssueInput,
  projectId: string,
  raisedBy: string,
  photoPaths: string[],
): Promise<Issue> {
  const issue = unwrap(
    await supabase
      .from('issues')
      .insert({
        ...toIssueRow(input),
        project_id: projectId,
        raised_by: raisedBy,
        // Assigning at capture time moves the issue straight past open.
        status: input.assignee_profile_id ? 'assigned' : 'open',
      })
      .select()
      .single(),
  ) as Issue;

  if (photoPaths.length > 0) {
    const { error } = await supabase.from('issue_photos').insert(
      photoPaths.map((storage_path) => ({ issue_id: issue.id, storage_path, kind: 'report' })),
    );
    if (error) throw error;
  }

  return issue;
}

/** Updates the editable fields of an issue. */
export async function updateIssue(issueId: string, input: Partial<IssueInput>): Promise<Issue> {
  return unwrap(
    await supabase.from('issues').update(toIssueRow(input)).eq('id', issueId).select().single(),
  ) as Issue;
}

/**
 * Resolves an issue.
 * An evidence photo is required, because "resolved" with no proof is how a
 * closed issue reopens a week later.
 */
export async function resolveIssue(
  issueId: string,
  resolutionNote: string,
  evidencePhotoPath: string,
): Promise<void> {
  const { error: photoError } = await supabase
    .from('issue_photos')
    .insert({ issue_id: issueId, storage_path: evidencePhotoPath, kind: 'evidence' });
  if (photoError) throw photoError;

  const { error } = await supabase
    .from('issues')
    .update({
      status: 'resolved',
      resolution_note: resolutionNote,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', issueId);
  if (error) throw error;
}

/** Closes a resolved issue. Only the raiser or the project manager may. */
export async function closeIssue(issueId: string): Promise<void> {
  const { error } = await supabase
    .from('issues')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', issueId);
  if (error) throw error;
}

/** Lists the comment thread on an issue. */
export async function fetchIssueComments(issueId: string): Promise<IssueComment[]> {
  return unwrap(
    await supabase
      .from('issue_comments')
      .select('*, author:profiles(*)')
      .eq('issue_id', issueId)
      .order('created_at'),
  ) as IssueComment[];
}

/** Adds a comment to an issue. */
export async function addIssueComment(
  issueId: string,
  authorProfileId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('issue_comments')
    .insert({ issue_id: issueId, author_profile_id: authorProfileId, body });
  if (error) throw error;
}
