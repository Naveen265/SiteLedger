import { supabase } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/supabase/errors';

/**
 * Company creation.
 *
 * Kept here rather than in the sign-up screen because it happens at two
 * different moments: immediately after sign-up when the project does not
 * require email confirmation, and after the first sign-in when it does.
 */

/** Remembers the company name across an email confirmation round trip. */
const PENDING_COMPANY_KEY = 'siteledger.pendingCompanyName';

/** Stores the name the user typed, so they do not retype it after confirming. */
export function rememberPendingCompanyName(name: string): void {
  try {
    window.localStorage.setItem(PENDING_COMPANY_KEY, name);
  } catch {
    // Storage being unavailable only costs a pre-filled field.
  }
}

/** Reads back a remembered company name, if there is one. */
export function readPendingCompanyName(): string {
  try {
    return window.localStorage.getItem(PENDING_COMPANY_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Clears the remembered name once the company exists. */
export function clearPendingCompanyName(): void {
  try {
    window.localStorage.removeItem(PENDING_COMPANY_KEY);
  } catch {
    // Nothing to do; a stale name is harmless.
  }
}

/**
 * Creates the company and makes the signed-in user its owner.
 * One database function does both, so a half-created tenant is not a state
 * the product can reach.
 */
export async function createCompanyWithOwner(
  companyName: string,
  fullName: string,
): Promise<void> {
  const { error } = await supabase.rpc('create_company_with_owner', {
    p_company_name: companyName,
    p_full_name: fullName,
  });
  if (error) throw new Error(toUserMessage(error));
  clearPendingCompanyName();
}
