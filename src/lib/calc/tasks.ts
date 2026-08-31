import type { Task } from '@/types/domain';
import type { TaskStatus } from '@/types/enums';
import { countBy } from '@/lib/utils/collections';

/**
 * Task derivations.
 * Overdue is never stored, because a stored flag drifts the moment the clock
 * passes midnight. It is always derived from the due date and the status.
 */

/** A task is overdue when its due date has passed and it is not done or verified. */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.due_date) return false;
  if (task.status === 'completed' || task.status === 'verified' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.due_date) < new Date(now.toDateString());
}

/** Counts overdue tasks in a list. */
export function countOverdueTasks(tasks: Task[], now?: Date): number {
  return tasks.filter((task) => isTaskOverdue(task, now)).length;
}

/** Counts tasks by status, for the task status chart. */
export function calculateTaskStatusCounts(tasks: Task[]): Record<TaskStatus, number> {
  const base = {
    created: 0, assigned: 0, in_progress: 0, completed: 0,
    verified: 0, on_hold: 0, cancelled: 0,
  } as Record<TaskStatus, number>;
  return { ...base, ...countBy(tasks, (task) => task.status) };
}

/**
 * Project progress: the average completion of all non cancelled tasks in the
 * project, weighted equally. A task at 40 percent contributes 40.
 */
export function calculateProjectProgressPct(tasks: Task[]): number {
  const counted = tasks.filter((task) => task.status !== 'cancelled');
  if (counted.length === 0) return 0;
  const total = counted.reduce((sum, task) => {
    // A verified or completed task counts as fully done regardless of its slider.
    const pct = task.status === 'verified' || task.status === 'completed' ? 100 : task.progress_pct;
    return sum + pct;
  }, 0);
  return Math.round(total / counted.length);
}

/** Whether the current user may move a task into the verified state. */
export function canVerifyTask(role: string, siteLevel: string | null): boolean {
  return role === 'pm' || role === 'owner' || (role === 'site' && siteLevel === 'engineer');
}
