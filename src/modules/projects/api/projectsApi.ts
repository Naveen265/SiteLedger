import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { rupeesToPaise } from '@/lib/format/currency';
import { nullIfEmpty, type ProjectInput } from '@/lib/validation';
import type { Project, ProjectMember } from '@/types/domain';

/**
 * Project reads and writes.
 * Projects are archived, never deleted, so history and cost stay intact.
 */

/** Maps form values to the row shape, converting rupees to stored paise. */
function toRow(input: ProjectInput, companyId: string) {
  return {
    company_id: companyId,
    name: input.name,
    code: nullIfEmpty(input.code),
    type: input.type ?? null,
    client_name: nullIfEmpty(input.client_name),
    address: nullIfEmpty(input.address),
    start_date: nullIfEmpty(input.start_date),
    planned_end_date: nullIfEmpty(input.planned_end_date),
    status: input.status,
    budget_paise: input.budget_rupees ? rupeesToPaise(input.budget_rupees) : null,
    description: nullIfEmpty(input.description),
  };
}

/** Reads one project by id. */
export async function fetchProject(projectId: string): Promise<Project> {
  return unwrap(
    await supabase.from('projects').select('*').eq('id', projectId).single(),
  ) as Project;
}

/** Creates a project and returns the stored row. */
export async function createProject(input: ProjectInput, companyId: string): Promise<Project> {
  return unwrap(
    await supabase.from('projects').insert(toRow(input, companyId)).select().single(),
  ) as Project;
}

/** Updates an existing project. */
export async function updateProject(
  projectId: string,
  input: ProjectInput,
  companyId: string,
): Promise<Project> {
  return unwrap(
    await supabase.from('projects').update(toRow(input, companyId)).eq('id', projectId).select().single(),
  ) as Project;
}

/** Archives a project. Nothing in the product hard deletes a project. */
export async function archiveProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId);
  if (error) throw error;
}

/** Lists the people assigned to a project. */
export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return unwrap(
    await supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', projectId),
  ) as ProjectMember[];
}

/** Replaces the project team with the supplied set of people. */
export async function setProjectMembers(projectId: string, profileIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId);
  if (deleteError) throw deleteError;

  if (profileIds.length === 0) return;

  const { error } = await supabase
    .from('project_members')
    .insert(profileIds.map((profileId) => ({ project_id: projectId, profile_id: profileId })));
  if (error) throw error;
}
