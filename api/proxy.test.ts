import { describe, expect, it } from 'vitest';
import { isAllowedPath, normalisePath, resolveProjectOrigin } from './proxy';

/**
 * The proxy is the only route into the database, so what it will and will not
 * forward is security-relevant and is tested rather than assumed.
 */
describe('isAllowedPath', () => {
  it('forwards the three API surfaces the application actually uses', () => {
    expect(isAllowedPath('rest/v1/projects')).toBe(true);
    expect(isAllowedPath('auth/v1/token')).toBe(true);
    expect(isAllowedPath('storage/v1/object/dpr-photos/a.jpg')).toBe(true);
  });

  it('forwards a bare prefix, which the client uses for health checks', () => {
    expect(isAllowedPath('rest/v1')).toBe(true);
  });

  it('tolerates a leading slash from the router', () => {
    expect(isAllowedPath('/rest/v1/projects')).toBe(true);
  });

  it('refuses anything outside the allowlist', () => {
    expect(isAllowedPath('pg/v1/query')).toBe(false);
    expect(isAllowedPath('realtime/v1/websocket')).toBe(false);
    expect(isAllowedPath('')).toBe(false);
  });

  it('refuses a prefix that merely starts with an allowed word', () => {
    expect(isAllowedPath('rest/v1evil')).toBe(false);
    expect(isAllowedPath('authorised/v1')).toBe(false);
  });

  it('refuses path traversal that would walk out of an allowed prefix', () => {
    expect(isAllowedPath('rest/v1/../../admin')).toBe(false);
    expect(isAllowedPath('storage/v1/../pg')).toBe(false);
  });
});

describe('normalisePath', () => {
  it('decodes the percent-encoded slashes the rewrite introduces', () => {
    // Forwarding this verbatim routed auth calls to PostgREST, which answered
    // PGRST125 rather than signing anyone in.
    expect(normalisePath('auth%2Fv1%2Fsettings')).toBe('auth/v1/settings');
  });

  it('leaves an already decoded path untouched', () => {
    expect(normalisePath('rest/v1/projects')).toBe('rest/v1/projects');
  });

  it('unwraps a value that was encoded more than once', () => {
    expect(normalisePath('auth%252Fv1%252Ftoken')).toBe('auth/v1/token');
  });

  it('strips a leading slash so the target URL never doubles it', () => {
    expect(normalisePath('/rest/v1/projects')).toBe('rest/v1/projects');
  });

  it('leaves a malformed sequence alone for the allowlist to reject', () => {
    const malformed = normalisePath('rest%2');
    expect(isAllowedPath(malformed)).toBe(false);
  });

  it('preserves encoded characters that are part of a storage object name', () => {
    expect(normalisePath('storage%2Fv1%2Fobject%2Fdpr-photos%2Fa%20b.jpg')).toBe(
      'storage/v1/object/dpr-photos/a b.jpg',
    );
  });
});

describe('resolveProjectOrigin', () => {
  const origin = 'https://abcdefgh.supabase.co';

  it('accepts the Project URL unchanged', () => {
    expect(resolveProjectOrigin(origin)).toBe(origin);
    expect(resolveProjectOrigin(`${origin}/`)).toBe(origin);
  });

  it('accepts the API URLs the dashboard shows, which are easy to copy by mistake', () => {
    // Setting the REST URL here sent every call, auth included, to PostgREST
    // and produced PGRST125 on a live deployment.
    expect(resolveProjectOrigin(`${origin}/rest/v1`)).toBe(origin);
    expect(resolveProjectOrigin(`${origin}/auth/v1`)).toBe(origin);
    expect(resolveProjectOrigin(`${origin}/storage/v1`)).toBe(origin);
    expect(resolveProjectOrigin(`${origin}/rest/v1/`)).toBe(origin);
  });

  it('refuses a path it cannot interpret rather than guessing', () => {
    expect(resolveProjectOrigin(`${origin}/some/other/path`)).toBeNull();
  });

  it('refuses a value that is not a URL at all', () => {
    expect(resolveProjectOrigin('abcdefgh.supabase.co')).toBeNull();
    expect(resolveProjectOrigin('')).toBeNull();
  });
});
