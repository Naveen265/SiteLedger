import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseBaseUrl } from '@/config/env';

/**
 * The single Supabase browser client.
 *
 * It is pointed at this application's own origin, not at Supabase. The proxy
 * function at `api/supabase/[...path].ts` holds the project URL and the key and
 * attaches them server-side, so neither ever reaches the browser.
 *
 * The key passed here is a placeholder that the proxy overwrites. The client
 * library requires a non-empty string, and this one is deliberately not a
 * credential: publishing it discloses nothing.
 */
const PROXIED_KEY_PLACEHOLDER = 'proxied-via-server';

export const supabase: SupabaseClient = createClient(
  supabaseBaseUrl(),
  PROXIED_KEY_PLACEHOLDER,
  {
    auth: {
      // Site staff must not be re-authenticated daily, that is an adoption killer.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'siteledger.auth',
    },
    global: {
      headers: { 'x-application-name': 'siteledger' },
    },
  },
);
