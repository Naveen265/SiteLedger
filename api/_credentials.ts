/**
 * Deriving a login address from a company code and a username.
 *
 * Site staff sign in with a company code and a username, never an email,
 * because many have no reliable email address. Supabase Auth requires one, so
 * it is synthesised here and shown to nobody.
 *
 * This file lives under api/ deliberately. The server function must be able to
 * import it at runtime, and Vercel only ships what sits inside api/ alongside
 * the function — an import reaching into src/ compiles but then fails in
 * production with ERR_MODULE_NOT_FOUND. The client re-exports it through
 * src/lib/auth/teamCredentials.ts, which Vite resolves at build time, so there
 * is exactly one definition and the two sides cannot drift.
 *
 * The leading underscore keeps Vercel from turning this into a route.
 */

/** The domain the synthetic addresses sit under. It receives no mail. */
const TEAM_EMAIL_DOMAIN = 'siteledger.app';

/** Builds the login address for a team account. */
export function buildTeamEmail(companyCode: string, username: string): string {
  return `${username.trim().toLowerCase()}@${companyCode.trim().toLowerCase()}.${TEAM_EMAIL_DOMAIN}`;
}

/** Whether a username is safe to embed in an email local part. */
export function isValidUsername(username: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,30}$/.test(username.trim().toLowerCase());
}

/** Whether a company code is safe to embed in an email domain label. */
export function isValidCompanyCode(code: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,20}$/.test(code.trim().toLowerCase());
}

/**
 * Whether what the user typed looks like an email rather than a username.
 * Owners sign up with a real email; their staff sign in with a username, and
 * the sign-in form accepts either without asking which one it is.
 */
export function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}
