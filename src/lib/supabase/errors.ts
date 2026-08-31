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

/** Extracts a user-facing message from any thrown value. */
export function toUserMessage(error: unknown): string {
  if (!error) return 'Could not complete the action. Try again.';

  const postgrest = error as Partial<PostgrestError>;
  if (postgrest?.code && CODE_MESSAGES[postgrest.code]) return CODE_MESSAGES[postgrest.code];

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
