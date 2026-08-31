import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { nullIfEmpty, type TaskInput } from '@/lib/validation';
import type { Task, TaskComment, TaskPhoto } from '@/types/domain';

/**
 * Task reads and writes.
 * The verified gate is enforced here and again in Row Level Security, so a
 * supervisor cannot set verified through the interface or a direct API call.
 */

/** Lists every task on a project, newest due date first. */
export async function fetchTasks(projectId: string): Promise<Task[]> {
  return unwrap(
    await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_profile_id_fkey(*)')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true, nullsFirst: false }),
  ) as Task[];
}

/** Lists tasks across several projects, used by the portfolio view. */
export async function fetchTasksForProjects(projectIds: string[]): Promise<Task[]> {
  if (projectIds.length === 0) return [];
  return unwrap(
    await supabase.from('tasks').select('*').in('project_id', projectIds),
  ) as Task[];
}

/** Reads one task with its assignee. */
export async function fetchTask(taskId: string): Promise<Task> {
  return unwrap(
    await supabase
      .from('tasks')
      .select('*, assignee:profiles!tasks_assignee_profile_id_fkey(*)')
      .eq('id', taskId)
      .single(),
  ) as Task;
}

/** Maps form values onto the row shape, turning empty strings into null. */
function toTaskRow(input: Partial<TaskInput>) {
  return {
    ...input,
    description: nullIfEmpty(input.description),
    assignee_name_text: nullIfEmpty(input.assignee_name_text),
    start_date: nullIfEmpty(input.start_date),
    due_date: nullIfEmpty(input.due_date),
    assignee_profile_id: input.assignee_profile_id || null,
  };
}

/** Creates a task on a project. */
export async function createTask(input: TaskInput, projectId: string): Promise<Task> {
  return unwrap(
    await supabase
      .from('tasks')
      .insert({ ...toTaskRow(input), project_id: projectId })
      .select()
      .single(),
  ) as Task;
}

/** Updates a task's editable fields. */
export async function updateTask(taskId: string, input: Partial<TaskInput>): Promise<Task> {
  return unwrap(
    await supabase.from('tasks').update(toTaskRow(input)).eq('id', taskId).select().single(),
  ) as Task;
}

/**
 * Moves a task into the verified state.
 * Verification stamps who did it and when, because "marked done but not done"
 * is the problem this gate exists to solve.
 */
export async function verifyTask(taskId: string, verifierProfileId: string): Promise<Task> {
  return unwrap(
    await supabase
      .from('tasks')
      .update({
        status: 'verified',
        progress_pct: 100,
        verified_by: verifierProfileId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single(),
  ) as Task;
}

/** Lists the comment thread on a task. */
export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  return unwrap(
    await supabase
      .from('task_comments')
      .select('*, author:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at'),
  ) as TaskComment[];
}

/** Adds a comment to a task. */
export async function addTaskComment(
  taskId: string,
  authorProfileId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .insert({ task_id: taskId, author_profile_id: authorProfileId, body });
  if (error) throw error;
}

/** Lists the photos attached to a task. */
export async function fetchTaskPhotos(taskId: string): Promise<TaskPhoto[]> {
  return unwrap(
    await supabase.from('task_photos').select('*').eq('task_id', taskId).order('created_at'),
  ) as TaskPhoto[];
}

/** Attaches uploaded photos to a task. */
export async function addTaskPhotos(taskId: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase
    .from('task_photos')
    .insert(paths.map((storage_path) => ({ task_id: taskId, storage_path, caption: null })));
  if (error) throw error;
}
