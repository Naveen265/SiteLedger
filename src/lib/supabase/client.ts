import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

/**
 * The single Supabase browser client.
 * Only the anon key is ever used here. Row Level Security is what enforces
 * tenancy, so the client never needs a privileged key.
 */
export const supabase: SupabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
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
});
