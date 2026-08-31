import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import { todayIso } from '@/lib/format/date';
import type { DprInput } from '@/lib/validation';
import { fetchDpr, fetchDprs, fetchDprsForProjects, fetchTodaysDpr, submitDpr } from '../api/dprApi';

/** Reads the reports submitted on a project. */
export function useDprs(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.dprs(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchDprs(projectId!),
  });
}

/** Reads reports across several projects, for the compliance chart. */
export function usePortfolioDprs(projectIds: string[]) {
  return useQuery({
    queryKey: ['dprs', 'portfolio', ...projectIds],
    enabled: projectIds.length > 0,
    queryFn: () => fetchDprsForProjects(projectIds),
  });
}

/** Reads one report with its task progress and photos. */
export function useDprDetail(dprId: string | null) {
  return useQuery({
    queryKey: queryKeys.dpr(dprId ?? ''),
    enabled: Boolean(dprId),
    queryFn: () => fetchDpr(dprId!),
  });
}

/** Checks whether this user already submitted a report today. */
export function useTodaysDpr(projectId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dpr', 'today', projectId, user?.id],
    enabled: Boolean(projectId && user),
    queryFn: () => fetchTodaysDpr(projectId!, user!.id, todayIso()),
  });
}

/**
 * Submits a report.
 * On success, task progress, project progress and every dashboard reading them
 * are invalidated together, so the whole product reflects the submission at
 * once rather than screen by screen.
 */
export function useSubmitDpr(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ values, photoPaths, timingSeconds }: {
      values: DprInput;
      photoPaths: string[];
      timingSeconds: number;
    }) =>
      submitDpr({
        projectId,
        submittedBy: user!.id,
        values,
        photoPaths,
        timingSeconds,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.dprs(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
      void client.invalidateQueries({ queryKey: ['dpr', 'today', projectId] });
      notify(t('dpr.submitted'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
