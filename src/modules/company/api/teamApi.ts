import { supabase } from '@/lib/supabase/client';
import type { Role, SiteLevel } from '@/types/enums';

/**
 * Client for the owner-managed team endpoint.
 *
 * The work happens server-side in api/team.ts, because creating a login for
 * somebody else needs administrative rights that must never reach a browser.
 * Everything here does is forward the owner's own token so the server can
 * confirm who is asking.
 */

/** Attaches the caller's session and unwraps the endpoint's error copy. */
async function callTeamEndpoint<T>(payload: Record<string, unknown>): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error('Your session has expired. Sign in again.');

  const response = await fetch('/api/team', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) {
    throw new Error(body?.message ?? 'Could not complete the action. Try again.');
  }
  return body as T;
}

export type CreateTeamMemberInput = {
  full_name: string;
  username: string;
  password: string;
  role: Role;
  site_level: SiteLevel | null;
  project_ids: string[];
};

/** Creates a login and the membership that gives it a role and projects. */
export function createTeamMember(input: CreateTeamMemberInput) {
  return callTeamEndpoint<{ profile_id: string; username: string; company_code: string }>({
    action: 'create',
    ...input,
  });
}

/** Sets a new password and requires the person to change it on next sign-in. */
export function resetTeamPassword(profileId: string, password: string) {
  return callTeamEndpoint<{ ok: true }>({
    action: 'resetPassword',
    profile_id: profileId,
    password,
  });
}

/** Disables or re-enables a member. Nobody is ever deleted. */
export function setTeamMemberStatus(profileId: string, status: 'active' | 'disabled') {
  return callTeamEndpoint<{ ok: true }>({
    action: 'setStatus',
    profile_id: profileId,
    status,
  });
}

/** Clears the forced-change flag once the person has chosen their own password. */
export async function completePasswordChange(newPassword: string): Promise<void> {
  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) throw new Error(updateError.message);

  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Your session has expired. Sign in again.');

  const { error } = await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', data.user.id);
  if (error) throw new Error(error.message);
}
