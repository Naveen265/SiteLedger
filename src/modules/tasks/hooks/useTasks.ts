import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { TaskInput } from '@/lib/validation';
import {
  addTaskComment, addTaskPhotos, createTask, fetchTask, fetchTaskComments,
  fetchTaskPhotos, fetchTasks, fetchTasksForProjects, updateTask, verifyTask,
} from '../api/tasksApi';

/** Reads every task on a project. */
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.tasks(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchTasks(projectId!),
  });
}

/** Reads tasks across several projects, for portfolio level progress. */
export function usePortfolioTasks(projectIds: string[]) {
  return useQuery({
    queryKey: ['tasks', 'portfolio', ...projectIds],
    enabled: projectIds.length > 0,
    queryFn: () => fetchTasksForProjects(projectIds),
  });
}

/** Reads one task. */
export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.task(taskId ?? ''),
    enabled: Boolean(taskId),
    queryFn: () => fetchTask(taskId!),
  });
}

/** Reads the comment thread on a task. */
export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: queryKeys.taskComments(taskId ?? ''),
    enabled: Boolean(taskId),
    queryFn: () => fetchTaskComments(taskId!),
  });
}

/** Reads the photos attached to a task. */
export function useTaskPhotos(taskId: string | null) {
  return useQuery({
    queryKey: ['task', taskId, 'photos'],
    enabled: Boolean(taskId),
    queryFn: () => fetchTaskPhotos(taskId!),
  });
}

/** Creates or updates a task, then refreshes the project's task list. */
export function useSaveTask(projectId: string, taskId?: string) {
  const client = useQueryClient();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: TaskInput) =>
      taskId ? updateTask(taskId, input) : createTask(input, projectId),
    onSuccess: (task) => {
      void client.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.task(task.id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Moves a task into the verified state, stamping who verified it. */
export function useVerifyTask(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (taskId: string) => verifyTask(taskId, user!.id),
    onSuccess: (task) => {
      void client.invalidateQueries({ queryKey: queryKeys.tasks(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.task(task.id) });
      notify(t('tasks.verified'), 'success');
    },
    onError: () => notify(t('tasks.cannotVerify'), 'error'),
  });
}

/** Adds a comment to a task. */
export function useAddTaskComment(taskId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (body: string) => addTaskComment(taskId, user!.id, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.taskComments(taskId) });
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Attaches uploaded photos to a task. */
export function useAddTaskPhotos(taskId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (paths: string[]) => addTaskPhotos(taskId, paths),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['task', taskId, 'photos'] });
    },
  });
}
