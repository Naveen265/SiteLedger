import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import type { DprInput } from '@/lib/validation';
import type { Dpr, DprPhoto, DprTaskProgress } from '@/types/domain';

/**
 * Daily progress report reads and writes.
 * The engineer supplies only what is genuinely new. Everything the system
 * already knows is pre-filled and never retyped.
 */

const DPR_SELECT =
  '*, submitter:profiles!dprs_submitted_by_fkey(*)';

/** Lists the reports submitted on a project, newest first. */
export async function fetchDprs(projectId: string): Promise<Dpr[]> {
  return unwrap(
    await supabase
      .from('dprs')
      .select(DPR_SELECT)
      .eq('project_id', projectId)
      .order('report_date', { ascending: false }),
  ) as Dpr[];
}

/** Lists reports across several projects, for the compliance chart. */
export async function fetchDprsForProjects(projectIds: string[]): Promise<Dpr[]> {
  if (projectIds.length === 0) return [];
  return unwrap(
    await supabase.from('dprs').select('id, project_id, report_date, created_at, updated_at, submitted_by, submitted_at, note, tomorrow_plan, weather, dpr_timing_seconds').in('project_id', projectIds),
  ) as Dpr[];
}

/** Reads one report with the task progress and photos attached to it. */
export async function fetchDpr(dprId: string): Promise<{
  dpr: Dpr;
  taskProgress: DprTaskProgress[];
  photos: DprPhoto[];
}> {
  const dpr = unwrap(
    await supabase.from('dprs').select(DPR_SELECT).eq('id', dprId).single(),
  ) as Dpr;

  const taskProgress = unwrap(
    await supabase
      .from('dpr_task_progress')
      .select('*, task:tasks(*)')
      .eq('dpr_id', dprId),
  ) as DprTaskProgress[];

  const photos = unwrap(
    await supabase.from('dpr_photos').select('*').eq('dpr_id', dprId),
  ) as DprPhoto[];

  return { dpr, taskProgress, photos };
}

/** Finds today's report for a user, so the form can open it rather than duplicate it. */
export async function fetchTodaysDpr(
  projectId: string,
  profileId: string,
  reportDate: string,
): Promise<Dpr | null> {
  const { data, error } = await supabase
    .from('dprs')
    .select(DPR_SELECT)
    .eq('project_id', projectId)
    .eq('submitted_by', profileId)
    .eq('report_date', reportDate)
    .maybeSingle();
  if (error) throw error;
  return (data as Dpr | null) ?? null;
}

/**
 * Submits a report.
 * One database function writes the report, its task progress rows, its photos,
 * and the updated progress on each task, as a single transaction. Submitting
 * therefore updates task progress and project progress with no second entry.
 */
export async function submitDpr(input: {
  projectId: string;
  submittedBy: string;
  values: DprInput;
  photoPaths: string[];
  /** Seconds from opening the form to submitting, so the 60 second target is measured. */
  timingSeconds: number;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('submit_dpr', {
    p_project_id: input.projectId,
    p_submitted_by: input.submittedBy,
    p_report_date: input.values.report_date,
    p_note: input.values.note,
    p_tomorrow_plan: input.values.tomorrow_plan,
    p_weather: input.values.weather,
    p_task_progress: input.values.task_progress,
    p_photo_paths: input.photoPaths,
    p_timing_seconds: input.timingSeconds,
  });
  if (error) throw error;
  return { id: data as string };
}
