/**
 * Turning a company code and username into the address Supabase Auth stores.
 *
 * Site staff sign in with a company code and a username, never an email,
 * because many of them have no reliable email address. The address below is
 * derived rather than looked up, which means signing in needs no lookup call
 * and therefore offers no way to discover which usernames exist.
 *
 * This must produce byte-identical output to `buildTeamEmail` in api/team.ts.
 * A test asserts the two agree; if they ever drift, nobody can sign in.
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
