import type { IncomingMessage, ServerResponse } from 'node:http';
import { Buffer } from 'node:buffer';
import process from 'node:process';
// Imported rather than duplicated: the client derives the same address when
// signing in, and two copies would eventually disagree and lock people out.
import {
  buildTeamEmail, isValidCompanyCode, isValidUsername,
} from '../src/lib/auth/teamCredentials';

/**
 * Owner-managed team accounts.
 *
 * This is the only place in the product that uses the Supabase service role
 * key, because creating a login for somebody else and resetting their password
 * are administrative operations the anon key cannot perform. That key bypasses
 * every Row Level Security policy, so three things are true of this file:
 *
 *   1. It never returns anything derived from the service role beyond what the
 *      caller is entitled to see.
 *   2. Every request re-establishes who the caller is from their own JWT, and
 *      confirms they are an active owner of the company being modified. The
 *      client's claim about its own role is never trusted.
 *   3. Every write is scoped to the caller's own company, so one owner cannot
 *      reach into another tenant.
 *
 * The key is read from the environment and never leaves this function.
 */

export const config = { regions: ['bom1'], maxDuration: 30 };

type Json = Record<string, unknown>;

/** Ends the response with JSON. */
function send(res: ServerResponse, status: number, body: Json): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

/** Reads and parses the JSON request body. */
async function readJson(req: IncomingMessage): Promise<Json> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString()) as Json;
  } catch {
    return {};
  }
}

/** Calls the Supabase REST or Auth API with the service role key. */
async function admin(
  baseUrl: string,
  serviceKey: string,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}

/**
 * Establishes who is calling, from their own bearer token, and confirms they
 * are an active owner. Returns null when they are not, which every handler
 * treats as a refusal.
 */
async function requireOwner(
  req: IncomingMessage,
  baseUrl: string,
  serviceKey: string,
): Promise<{ profileId: string; companyId: string; companyCode: string } | null> {
  const header = req.headers['authorization'];
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
  if (!token) return null;

  // Verified by Supabase against its own signing key, not decoded locally.
  const who = await fetch(`${baseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${token}` },
  });
  if (!who.ok) return null;
  const user = (await who.json()) as { id?: string };
  if (!user.id) return null;

  const membership = await admin(
    baseUrl,
    serviceKey,
    `/rest/v1/company_members?select=company_id,role,status,company:companies(code)` +
      `&profile_id=eq.${user.id}&status=eq.active&role=eq.owner`,
  );
  const rows = membership.data as Array<{ company_id: string; company: { code: string } | null }>;
  if (!Array.isArray(rows) || rows.length === 0) return null;

  return {
    profileId: user.id,
    companyId: rows[0].company_id,
    companyCode: rows[0].company?.code ?? '',
  };
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/(rest|auth|storage)\/v1\/?$/, '').replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceKey) {
    send(res, 500, {
      message:
        'Team management is not configured. Add SUPABASE_SERVICE_ROLE_KEY in the Vercel project settings.',
    });
    return;
  }

  if (req.method !== 'POST') {
    send(res, 405, { message: 'Use POST.' });
    return;
  }

  const caller = await requireOwner(req, baseUrl, serviceKey);
  if (!caller) {
    send(res, 403, { message: 'Only an owner can manage team members.' });
    return;
  }

  const body = await readJson(req);
  const action = String(body.action ?? '');

  try {
    if (action === 'create') return await createMember(res, baseUrl, serviceKey, caller, body);
    if (action === 'resetPassword') return await resetPassword(res, baseUrl, serviceKey, caller, body);
    if (action === 'setStatus') return await setStatus(res, baseUrl, serviceKey, caller, body);
    send(res, 400, { message: 'Unknown action.' });
  } catch (error) {
    console.error('team endpoint failed', { action, error });
    send(res, 500, { message: 'Could not complete the action. Try again.' });
  }
}

/** Creates a login and the membership that gives it a role and projects. */
async function createMember(
  res: ServerResponse,
  baseUrl: string,
  serviceKey: string,
  caller: { companyId: string; companyCode: string; profileId: string },
  body: Json,
): Promise<void> {
  const fullName = String(body.full_name ?? '').trim();
  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const role = String(body.role ?? '');
  const siteLevel = body.site_level ? String(body.site_level) : null;
  const projectIds = Array.isArray(body.project_ids) ? (body.project_ids as string[]) : [];

  if (!fullName) return send(res, 400, { message: 'Enter the person’s full name.' });
  if (!isValidUsername(username)) {
    return send(res, 400, {
      message:
        'Usernames use lowercase letters, numbers, dots, dashes or underscores, and are at least 2 characters.',
    });
  }
  if (password.length < 8) {
    return send(res, 400, { message: 'Choose a password of at least 8 characters.' });
  }
  if (!['owner', 'pm', 'site', 'procurement', 'accounts'].includes(role)) {
    return send(res, 400, { message: 'Choose a role.' });
  }
  if (!isValidCompanyCode(caller.companyCode)) {
    return send(res, 400, {
      message: 'Your company has no valid short code yet. Set one in company settings first.',
    });
  }

  const email = buildTeamEmail(caller.companyCode, username);

  // Confirmed immediately: nobody can open a link at an address that does not
  // receive mail, and the owner is handing the password over in person.
  const created = await admin(baseUrl, serviceKey, '/auth/v1/admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true, user_metadata: { full_name: fullName } },
  });

  if (created.status >= 400) {
    const detail = created.data as { msg?: string; message?: string } | null;
    const raw = detail?.msg ?? detail?.message ?? '';
    return send(res, 400, {
      message: /already|registered|exists/i.test(raw)
        ? 'That username is already taken in your company. Choose another.'
        : 'Could not create the login. Check the username and password and try again.',
    });
  }

  const newUser = created.data as { id: string };

  // The profile row is created by a trigger; fill in the details and require a
  // password change on first sign-in.
  await admin(baseUrl, serviceKey, `/rest/v1/profiles?id=eq.${newUser.id}`, {
    method: 'PATCH',
    body: { full_name: fullName, must_change_password: true },
  });

  const membership = await admin(baseUrl, serviceKey, '/rest/v1/company_members', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: {
      company_id: caller.companyId,
      profile_id: newUser.id,
      role,
      site_level: role === 'site' ? (siteLevel ?? 'supervisor') : null,
      status: 'active',
      username,
      invited_by: caller.profileId,
    },
  });

  if (membership.status >= 400) {
    // Leaving an orphaned login behind would block the username forever.
    await admin(baseUrl, serviceKey, `/auth/v1/admin/users/${newUser.id}`, { method: 'DELETE' });
    return send(res, 400, { message: 'That username is already taken in your company.' });
  }

  if (projectIds.length > 0) {
    await admin(baseUrl, serviceKey, '/rest/v1/project_members', {
      method: 'POST',
      body: projectIds.map((project_id) => ({ project_id, profile_id: newUser.id })),
    });
  }

  send(res, 200, { profile_id: newUser.id, username, company_code: caller.companyCode });
}

/** Sets a new password and requires the person to change it on next sign-in. */
async function resetPassword(
  res: ServerResponse,
  baseUrl: string,
  serviceKey: string,
  caller: { companyId: string },
  body: Json,
): Promise<void> {
  const profileId = String(body.profile_id ?? '');
  const password = String(body.password ?? '');
  if (password.length < 8) {
    return send(res, 400, { message: 'Choose a password of at least 8 characters.' });
  }

  // Confirms the target belongs to the caller's company before touching them.
  const member = await admin(
    baseUrl,
    serviceKey,
    `/rest/v1/company_members?select=profile_id&company_id=eq.${caller.companyId}&profile_id=eq.${profileId}`,
  );
  if (!Array.isArray(member.data) || member.data.length === 0) {
    return send(res, 403, { message: 'That person is not in your company.' });
  }

  await admin(baseUrl, serviceKey, `/auth/v1/admin/users/${profileId}`, {
    method: 'PUT',
    body: { password },
  });
  await admin(baseUrl, serviceKey, `/rest/v1/profiles?id=eq.${profileId}`, {
    method: 'PATCH',
    body: { must_change_password: true },
  });

  send(res, 200, { ok: true });
}

/** Disables or re-enables a member. Nobody is ever deleted. */
async function setStatus(
  res: ServerResponse,
  baseUrl: string,
  serviceKey: string,
  caller: { companyId: string; profileId: string },
  body: Json,
): Promise<void> {
  const profileId = String(body.profile_id ?? '');
  const status = String(body.status ?? '');
  if (!['active', 'disabled'].includes(status)) {
    return send(res, 400, { message: 'Status must be active or disabled.' });
  }
  if (profileId === caller.profileId) {
    return send(res, 400, { message: 'You cannot disable your own account.' });
  }

  const updated = await admin(
    baseUrl,
    serviceKey,
    `/rest/v1/company_members?company_id=eq.${caller.companyId}&profile_id=eq.${profileId}`,
    { method: 'PATCH', body: { status } },
  );
  if (updated.status >= 400) {
    return send(res, 400, { message: 'Could not update that person.' });
  }
  send(res, 200, { ok: true });
}
