import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { ProjectInput } from '@/lib/validation';
import {
  archiveProject, createProject, fetchProject, fetchProjectMembers,
  setProjectMembers, updateProject,
} from '../api/projectsApi';

/** Reads a single project. */
export function useProjectDetail(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchProject(projectId!),
  });
}

/** Reads the people assigned to a project. */
export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectMembers(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectMembers(projectId!),
  });
}

/** Creates or updates a project, then refreshes the project list. */
export function useSaveProject(projectId?: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: ProjectInput) =>
      projectId
        ? updateProject(projectId, input, user!.company_id)
        : createProject(input, user!.company_id),
    onSuccess: (project) => {
      void client.invalidateQueries({ queryKey: queryKeys.projects(user!.company_id) });
      void client.invalidateQueries({ queryKey: queryKeys.project(project.id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Archives a project and refreshes the list. */
export function useArchiveProject() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: archiveProject,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.projects(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Replaces the project team. */
export function useSaveProjectMembers(projectId: string) {
  const client = useQueryClient();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (profileIds: string[]) => setProjectMembers(projectId, profileIds),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.projectMembers(projectId) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
