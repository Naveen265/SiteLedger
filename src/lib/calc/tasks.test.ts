import { describe, expect, it } from 'vitest';
import { calculateProjectProgressPct, canVerifyTask, countOverdueTasks, isTaskOverdue } from './tasks';
import type { Task } from '@/types/domain';

/** Builds a task with only the fields these rules actually read. */
function task(partial: Partial<Task>): Task {
  return {
    id: partial.id ?? 't1', created_at: '', updated_at: '',
    project_id: 'p1', title: 'Task', description: null,
    assignee_profile_id: null, assignee_name_text: null,
    start_date: null, due_date: null, priority: 'medium',
    status: 'created', progress_pct: 0, verified_by: null, verified_at: null,
    ...partial,
  };
}

const NOW = new Date('2026-08-31');

describe('isTaskOverdue', () => {
  it('is overdue when the due date has passed and the work is not done', () => {
    expect(isTaskOverdue(task({ due_date: '2026-08-20', status: 'in_progress' }), NOW)).toBe(true);
  });

  it('is not overdue once the task is completed', () => {
    expect(isTaskOverdue(task({ due_date: '2026-08-20', status: 'completed' }), NOW)).toBe(false);
  });

  it('is not overdue once the task is verified', () => {
    expect(isTaskOverdue(task({ due_date: '2026-08-20', status: 'verified' }), NOW)).toBe(false);
  });

  it('is not overdue when there is no due date', () => {
    expect(isTaskOverdue(task({ status: 'in_progress' }), NOW)).toBe(false);
  });

  it('is never overdue when cancelled', () => {
    expect(isTaskOverdue(task({ due_date: '2026-01-01', status: 'cancelled' }), NOW)).toBe(false);
  });
});

describe('countOverdueTasks', () => {
  it('counts only the tasks that are actually late', () => {
    const tasks = [
      task({ id: '1', due_date: '2026-08-01', status: 'in_progress' }),
      task({ id: '2', due_date: '2026-09-30', status: 'in_progress' }),
      task({ id: '3', due_date: '2026-08-01', status: 'completed' }),
    ];
    expect(countOverdueTasks(tasks, NOW)).toBe(1);
  });
});

describe('calculateProjectProgressPct', () => {
  it('averages task progress, weighting each task equally', () => {
    const tasks = [
      task({ id: '1', progress_pct: 40, status: 'in_progress' }),
      task({ id: '2', progress_pct: 60, status: 'in_progress' }),
    ];
    expect(calculateProjectProgressPct(tasks)).toBe(50);
  });

  it('counts a completed task as 100 regardless of its slider', () => {
    const tasks = [
      task({ id: '1', progress_pct: 20, status: 'completed' }),
      task({ id: '2', progress_pct: 0, status: 'created' }),
    ];
    expect(calculateProjectProgressPct(tasks)).toBe(50);
  });

  it('excludes cancelled tasks entirely', () => {
    const tasks = [
      task({ id: '1', progress_pct: 100, status: 'completed' }),
      task({ id: '2', progress_pct: 0, status: 'cancelled' }),
    ];
    expect(calculateProjectProgressPct(tasks)).toBe(100);
  });

  it('is zero when there are no countable tasks', () => {
    expect(calculateProjectProgressPct([])).toBe(0);
  });
});

describe('canVerifyTask', () => {
  it('allows a project manager and an owner', () => {
    expect(canVerifyTask('pm', null)).toBe(true);
    expect(canVerifyTask('owner', null)).toBe(true);
  });

  it('allows a site engineer but never a site supervisor', () => {
    expect(canVerifyTask('site', 'engineer')).toBe(true);
    expect(canVerifyTask('site', 'supervisor')).toBe(false);
  });
});
