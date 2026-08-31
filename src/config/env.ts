/**
 * Reads and validates every environment variable the app depends on.
 * Nothing else in the codebase touches `import.meta.env` directly, so a missing
 * key fails loudly here at startup instead of silently at a random call site.
 */
type EnvShape = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  /** Phone plus OTP login needs a paid SMS provider, so it ships behind a flag. */
  phoneAuthEnabled: boolean;
  /** Which storage backend photo uploads go to. Swappable without code changes. */
  storageProvider: 'supabase';
};

/** Reads one variable, throwing a message that names the key and the fix. */
function required(key: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Reads an optional variable, falling back to the supplied default. */
function optional(key: string, fallback: string): string {
  return (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) || fallback;
}

export const env: EnvShape = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  siteUrl: optional('VITE_SITE_URL', window.location.origin),
  phoneAuthEnabled: optional('VITE_AUTH_PHONE_ENABLED', 'false') === 'true',
  storageProvider: optional('VITE_STORAGE_PROVIDER', 'supabase') as 'supabase',
};
