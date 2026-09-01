import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Turns a database or network failure into a message that says what happened
 * and what to do about it. The product never shows "Something went wrong".
 */

/** Maps known Postgres error codes to actionable copy. */
const CODE_MESSAGES: Record<string, string> = {
  '23505': 'That record already exists. Open the existing one instead of creating a new one.',
  '23503': 'A linked record is missing. Refresh the page and try again.',
  '23514': 'Some values are outside the allowed range. Check the highlighted fields.',
  '42501': 'You do not have permission for this action. Ask an owner to change your role.',
  PGRST116: 'That record was not found. It may have been archived by someone else.',
};

/**
 * Messages Supabase returns that need translating into something actionable.
 * Matched on a fragment because the exact wording varies between versions.
 */
const MESSAGE_PATTERNS: Array<{ match: RegExp; message: string }> = [
  {
    // Supabase's built-in mail service allows only a few messages per hour,
    // which is easy to exhaust while setting a project up.
    match: /email rate limit|over_email_send_rate_limit/i,
    message:
      'Too many confirmation emails have been sent from this project in the last hour. ' +
      'Wait an hour, or turn off email confirmation in Supabase under Authentication, ' +
      'Sign in and up, so no email is needed.',
  },
  {
    match: /for security purposes.*after (\d+) seconds?/i,
    message: 'That was requested too recently. Wait a minute and try again.',
  },
  {
    match: /rate limit|too many requests/i,
    message: 'Too many attempts in a short time. Wait a few minutes and try again.',
  },
  {
    match: /user already registered|already been registered/i,
    message:
      'An account already exists for this email. Sign in instead, or reset the password if you have forgotten it.',
  },
  {
    match: /email not confirmed/i,
    message:
      'This email has not been confirmed yet. Open the link in the confirmation email, then sign in.',
  },
  {
    match: /email address .* is invalid|email_address_invalid/i,
    message: 'That email address was rejected. Use a real address you can receive mail at.',
  },
];

/** Extracts a user-facing message from any thrown value. */
export function toUserMessage(error: unknown): string {
  if (!error) return 'Could not complete the action. Try again.';

  const postgrest = error as Partial<PostgrestError>;
  if (postgrest?.code && CODE_MESSAGES[postgrest.code]) return CODE_MESSAGES[postgrest.code];

  // Auth failures arrive as plain messages rather than codes, so they are
  // matched on their text before anything else is tried.
  const raw =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === 'string'
        ? String((error as { message: string }).message)
        : '';

  if (raw) {
    const known = MESSAGE_PATTERNS.find((pattern) => pattern.match.test(raw));
    if (known) return known.message;
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch')) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    if (error.message.includes('Invalid login credentials')) {
      return 'That email and password did not match. Check both and try again.';
    }
    if (error.message.includes('Token has expired') || error.message.includes('expired')) {
      return 'That code has expired. Request a new one.';
    }
    return error.message;
  }

  return 'Could not complete the action. Try again.';
}

/** Unwraps a Supabase response, throwing a readable error when it failed. */
export function unwrap<T>(response: { data: T | null; error: PostgrestError | null }): T {
  if (response.error) throw new Error(toUserMessage(response.error));
  if (response.data === null) throw new Error('No data was returned. Refresh and try again.');
  return response.data;
}
