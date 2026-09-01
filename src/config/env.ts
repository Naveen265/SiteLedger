/**
 * Client configuration.
 *
 * Note what is NOT here: the Supabase project URL and the anon key. A value the
 * browser can read is a value anyone can read, so both live on the server and
 * the client reaches Supabase through the proxy at `/api/supabase`. Nothing in
 * this file is a credential.
 */
type EnvShape = {
  /** Same-origin path the Supabase client talks to. Never a Supabase URL. */
  supabaseProxyPath: string;
  siteUrl: string;
  /** Phone plus OTP login needs a paid SMS provider, so it ships behind a flag. */
  phoneAuthEnabled: boolean;
  /** Which storage backend photo uploads go to. Swappable without code changes. */
  storageProvider: 'supabase';
};

/** Reads an optional variable, falling back to the supplied default. */
function optional(key: string, fallback: string): string {
  return (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) || fallback;
}

export const env: EnvShape = {
  // Requests go to this application's own origin. The proxy attaches the real
  // project URL and key server-side.
  supabaseProxyPath: '/api/supabase',
  siteUrl: optional('VITE_SITE_URL', window.location.origin),
  phoneAuthEnabled: optional('VITE_AUTH_PHONE_ENABLED', 'false') === 'true',
  storageProvider: optional('VITE_STORAGE_PROVIDER', 'supabase') as 'supabase',
};

/** The absolute base URL the Supabase client is pointed at. */
export function supabaseBaseUrl(): string {
  return `${window.location.origin}${env.supabaseProxyPath}`;
}
