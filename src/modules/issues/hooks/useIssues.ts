import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { IssueInput } from '@/lib/validation';
import {
  addIssueComment, closeIssue, createIssue, fetchIssue, fetchIssueComments,
  fetchIssues, fetchIssuesForProjects, resolveIssue, updateIssue,
} from '../api/issuesApi';

/** Reads every issue on a project. */
export function useIssues(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.issues(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchIssues(projectId!),
  });
}

/** Reads issues across several projects, for the owner view. */
export function usePortfolioIssues(projectIds: string[]) {
  return useQuery({
    queryKey: ['issues', 'portfolio', ...projectIds],
    enabled: projectIds.length > 0,
    queryFn: () => fetchIssuesForProjects(projectIds),
  });
}

/** Reads one issue. */
export function useIssue(issueId: string | null) {
  return useQuery({
    queryKey: queryKeys.issue(issueId ?? ''),
    enabled: Boolean(issueId),
    queryFn: () => fetchIssue(issueId!),
  });
}

/** Reads the comment thread on an issue. */
export function useIssueComments(issueId: string | null) {
  return useQuery({
    queryKey: ['issue', issueId, 'comments'],
    enabled: Boolean(issueId),
    queryFn: () => fetchIssueComments(issueId!),
  });
}

/** Creates an issue with its capture photos. */
export function useCreateIssue(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ input, photoPaths }: { input: IssueInput; photoPaths: string[] }) =>
      createIssue(input, projectId, user!.id, photoPaths),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.issues(projectId) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Updates an issue's assignee, priority or due date. */
export function useUpdateIssue(projectId: string, issueId: string) {
  const client = useQueryClient();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: Partial<IssueInput>) => updateIssue(issueId, input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.issues(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Resolves an issue, requiring an evidence photo. */
export function useResolveIssue(projectId: string, issueId: string) {
  const client = useQueryClient();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ note, evidencePath }: { note: string; evidencePath: string }) =>
      resolveIssue(issueId, note, evidencePath),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.issues(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Closes a resolved issue. */
export function useCloseIssue(projectId: string, issueId: string) {
  const client = useQueryClient();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: () => closeIssue(issueId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.issues(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.issue(issueId) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Adds a comment to an issue. */
export function useAddIssueComment(issueId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (body: string) => addIssueComment(issueId, user!.id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['issue', issueId, 'comments'] });
    },
  });
}
