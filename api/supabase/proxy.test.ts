import { describe, expect, it } from 'vitest';
import { isAllowedPath } from './[...path]';

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
