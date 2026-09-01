/**
 * Supabase credential proxy.
 *
 * Why this exists: a browser-only application cannot hold a secret. Anything
 * the client needs in order to call an API is, by definition, reachable by
 * anyone reading the page. Putting the Supabase URL and key in the bundle
 * publishes them.
 *
 * This function keeps both on the server. The browser talks only to
 * `/api/supabase/*` on its own origin; this handler attaches the real project
 * URL and key and forwards the request. Neither value is ever sent to a client,
 * so they appear in no bundle, no source map and no page source.
 *
 * What this does NOT change: Row Level Security is still the security boundary.
 * This endpoint is reachable without a key, exactly as the anon key would have
 * been, so every policy in `supabase/migrations/0003_rls.sql` still does the
 * real work. What it buys is that the credentials are rotatable without a
 * rebuild, absent from the shipped code, and funnelled through one place that
 * can later be rate limited.
 *
 * The user's own JWT is passed straight through, so per-user policies continue
 * to apply exactly as they would on a direct connection.
 */

export const config = {
  // Fluid Compute on the Node.js runtime. Placed in Mumbai so the extra hop to
  // a Supabase project in ap-south-1 costs single digit milliseconds.
  runtime: 'nodejs',
  regions: ['bom1'],
  maxDuration: 30,
};

/** Reads a required server-side variable, failing loudly rather than silently. */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing environment variable ${key}. Set it in the Vercel project settings.`,
    );
  }
  return value;
}

/**
 * Request headers that must not be forwarded.
 * Hop-by-hop headers belong to the connection, not the message, and forwarding
 * an encoding or length header from a body we may have re-read corrupts it.
 */
const STRIPPED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'accept-encoding',
  // Vercel's own routing headers, which mean nothing to Supabase.
  'x-vercel-id',
  'x-vercel-forwarded-for',
  'x-vercel-deployment-url',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-for',
]);

/** Response headers that must not be passed back to the browser. */
const STRIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

/**
 * Path prefixes this proxy is willing to forward.
 * An open pass-through to any path on the project would be a wider surface
 * than the application needs, so the list is explicit.
 */
const ALLOWED_PREFIXES = ['rest/v1', 'auth/v1', 'storage/v1'];

/**
 * Whether the requested path is one the application actually uses.
 * Exported so the allowlist is unit tested rather than trusted.
 */
export function isAllowedPath(path: string): boolean {
  const normalised = path.replace(/^\/+/, '');
  // A traversal segment could otherwise walk out of an allowed prefix.
  if (normalised.includes('..')) return false;
  return ALLOWED_PREFIXES.some(
    (prefix) => normalised === prefix || normalised.startsWith(`${prefix}/`),
  );
}

/**
 * An error body carrying every key the Supabase clients look for.
 * PostgREST reads `message`, GoTrue reads `msg` and `error_description`, so a
 * proxy failure surfaces as readable copy rather than "[object Object]".
 */
function errorBody(message: string) {
  return { message, msg: message, error: message, error_description: message };
}

export default async function handler(request: Request): Promise<Response> {
  let supabaseUrl: string;
  let supabaseKey: string;

  try {
    supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
    supabaseKey = requireEnv('SUPABASE_ANON_KEY');
  } catch (error) {
    // A configuration mistake should say what is wrong and where to fix it,
    // never surface as an opaque 500.
    return Response.json(
      errorBody(error instanceof Error ? error.message : 'Server is not configured.'),
      { status: 500 },
    );
  }

  const incoming = new URL(request.url);
  const path = incoming.pathname.replace(/^\/api\/supabase\/?/, '');

  if (!isAllowedPath(path)) {
    return Response.json(errorBody('Not found.'), { status: 404 });
  }

  const target = new URL(`${supabaseUrl}/${path}`);
  target.search = incoming.search;

  // Copy the client's headers, then overwrite the credential ones. The user's
  // Authorization bearer is preserved, which is what keeps Row Level Security
  // scoped to the signed-in person rather than to the anon role.
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  headers.set('apikey', supabaseKey);
  if (!headers.has('authorization')) {
    headers.set('authorization', `Bearer ${supabaseKey}`);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      // GET and HEAD carry no body; anything else is streamed straight through
      // so a large photo upload is never buffered in the function's memory.
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      // Required by undici whenever a streaming body is forwarded.
      duplex: 'half',
      redirect: 'manual',
    } as RequestInit);

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
    });

    // Responses carry per-user data and must never be cached by a shared cache.
    responseHeaders.set('cache-control', 'no-store');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      errorBody('Could not reach the database. Check your connection and try again.'),
      { status: 502 },
    );
  }
}
