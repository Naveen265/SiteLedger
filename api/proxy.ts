import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import process from 'node:process';

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
 *
 * Routing: `vercel.json` rewrites `/api/supabase/:sbpath*` here. An explicit
 * rewrite is used rather than a `[...path]` catch-all filename, because
 * catch-all routing is a framework convention this plain Vite build does not
 * get for free: the first deployment built the function but generated no route
 * for it.
 *
 * Handler style: this is the Node.js `(req, res)` signature rather than the
 * Web `Request`/`Response` one. The runtime supplies an `IncomingMessage`, so
 * the Web style fails at runtime with `request.headers.get is not a function`.
 */

export const config = {
  // Placed in Mumbai so the extra hop to a Supabase project in ap-south-1
  // costs single digit milliseconds.
  regions: ['bom1'],
  maxDuration: 30,
};

/**
 * The query parameter carrying the requested Supabase path.
 * Vercel appends the matched group from the rewrite's source pattern to the
 * destination query, so this must match the `:sbpath*` group in vercel.json.
 */
const PATH_PARAM = 'sbpath';

/**
 * Request headers that must not be forwarded.
 * Hop-by-hop headers describe the connection rather than the message, and a
 * stale length or encoding header corrupts a body we are re-framing.
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
 * The API suffixes the Supabase dashboard shows on its own URLs.
 * Copying the REST URL instead of the Project URL is an easy mistake, and it
 * fails opaquely: every call lands on PostgREST and returns PGRST125, auth
 * included. These are stripped rather than rejected, because the project
 * origin is unambiguous once one of them is recognised.
 */
const DASHBOARD_URL_SUFFIXES = ['/rest/v1', '/auth/v1', '/storage/v1', '/realtime/v1'];

/**
 * Reduces a copied Supabase URL to the project origin.
 * Returns null when the URL carries a path that is not a recognised API
 * suffix, since guessing at an arbitrary path would be worse than saying so.
 *
 * Exported so this is unit tested rather than assumed.
 */
export function resolveProjectOrigin(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  if (path === '') return parsed.origin;
  if (DASHBOARD_URL_SUFFIXES.includes(path)) return parsed.origin;
  return null;
}

/**
 * Normalises the path taken from the rewrite's query parameter.
 *
 * Vercel percent-encodes the matched group, so `auth/v1/settings` arrives as
 * `auth%2Fv1%2Fsettings`. Forwarding that verbatim makes Supabase's gateway
 * treat the whole thing as one segment and route it to PostgREST, which
 * answers PGRST125 "Invalid path specified in request URL".
 *
 * Exported so the decoding is unit tested rather than assumed.
 */
export function normalisePath(raw: string): string {
  let path = raw;
  // Decode repeatedly: a single pass is not enough if the value was encoded
  // more than once on the way through the rewrite.
  for (let pass = 0; pass < 3 && path.includes('%'); pass += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      // A malformed sequence is left as-is; the allowlist will reject it.
      break;
    }
    if (decoded === path) break;
    path = decoded;
  }
  return path.replace(/^\/+/, '');
}

/**
 * An error body carrying every key the Supabase clients look for.
 * PostgREST reads `message`, GoTrue reads `msg` and `error_description`, so a
 * proxy failure surfaces as readable copy rather than "[object Object]".
 */
function errorBody(message: string) {
  return { message, msg: message, error: message, error_description: message };
}

/** Ends the response with a JSON error in the shape the clients expect. */
function sendError(res: ServerResponse, status: number, message: string): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(errorBody(message)));
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // A configuration mistake should say what is wrong and where to fix it,
  // never surface as an opaque 500.
  if (!supabaseUrl || !supabaseKey) {
    sendError(
      res,
      500,
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set both in the Vercel project settings.',
    );
    return;
  }

  // Accepts either the Project URL or one of the API URLs the dashboard
  // displays, both of which resolve to the same project origin.
  const projectOrigin = resolveProjectOrigin(supabaseUrl);
  if (!projectOrigin) {
    sendError(
      res,
      500,
      'SUPABASE_URL should be your project origin, for example ' +
        'https://your-project.supabase.co. The value set carries a path that is ' +
        'not a recognised Supabase API URL.',
    );
    return;
  }

  // `req.url` is a path rather than an absolute URL, so URL needs a base. The
  // host only satisfies the parser; nothing is resolved against it.
  const incoming = new URL(req.url ?? '/', 'https://proxy.invalid');

  // The rewrite supplies the path here. The pathname fallback keeps the
  // function working if it is ever called directly.
  const path = normalisePath(
    incoming.searchParams.get(PATH_PARAM) ??
      incoming.pathname.replace(/^\/api\/supabase\/?/, ''),
  );

  if (!isAllowedPath(path)) {
    sendError(res, 404, 'Not found.');
    return;
  }

  const target = new URL(`${projectOrigin}/${path}`);

  // Forward the caller's own query string, minus the routing parameter, so
  // PostgREST filters and auth grant types arrive intact.
  const forwardedParams = new URLSearchParams(incoming.searchParams);
  forwardedParams.delete(PATH_PARAM);
  target.search = forwardedParams.toString();

  // Copy the client's headers, then overwrite the credential ones. The user's
  // Authorization bearer is preserved, which is what keeps Row Level Security
  // scoped to the signed-in person rather than to the anon role.
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  headers.set('apikey', supabaseKey);
  if (!headers.has('authorization')) {
    headers.set('authorization', `Bearer ${supabaseKey}`);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      // The request is streamed rather than buffered, so a large document
      // upload never has to fit in this function's memory.
      body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
      // Required by undici whenever a streaming body is forwarded.
      duplex: 'half',
      redirect: 'manual',
    } as RequestInit);

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
    });
    // Responses carry per-user data and must never sit in a shared cache.
    res.setHeader('cache-control', 'no-store');

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  } catch {
    sendError(res, 502, 'Could not reach the database. Check your connection and try again.');
  }
}
