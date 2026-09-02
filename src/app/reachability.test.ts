import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every screen must be reachable by clicking.
 *
 * A route with no link into it is invisible: the page exists, the code works,
 * and no user can ever get there. That shipped twice — team management had a
 * route and no navigation entry, and /company/settings was a duplicate nobody
 * could reach. Walking routes by typing URLs cannot detect either, because
 * typing the URL is precisely the step a real user never performs.
 *
 * This test fails the build when a route is added without a way in.
 */

/** Routes users legitimately arrive at without clicking anything in the app. */
const EXTERNAL_ENTRY_POINTS: Record<string, string> = {
  signIn: 'The starting point for a signed-out visitor.',
  signUp: 'Linked from sign-in, and the entry point for a new company.',
  forgotPassword: 'Linked from sign-in.',
  resetPassword: 'Opened from the link in a password reset email, never from inside the app.',
  site: 'The home screen a site user is routed to on sign-in.',
  company: 'The home screen an owner is routed to on sign-in.',
  projects: 'The home screen a project manager is routed to on sign-in.',
};

/** Reads every source file under src, including the .ts config files. */
function readSources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) readSources(path, out);
    else if (/\.tsx?$/.test(path) && !path.endsWith('.test.ts') && !path.endsWith('.test.tsx')) {
      out.push(path);
    }
  }
  return out;
}

describe('every route is reachable', () => {
  const router = readFileSync('src/app/router.tsx', 'utf8');
  const declared = [...router.matchAll(/path=\{routes\.(\w+)/g)].map((m) => m[1]);

  // Everything except the router itself: the router declaring a route is not
  // the same as a screen offering a way to get to it.
  const elsewhere = readSources('src')
    .filter((path) => !path.includes('app/router'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  it('declares at least the core routes, so this test cannot pass vacuously', () => {
    expect(declared.length).toBeGreaterThan(8);
  });

  it.each(declared)('%s is linked from somewhere, or is a documented entry point', (name) => {
    const isLinked = new RegExp(`routes\\.${name}\\b`).test(elsewhere);
    const reason = EXTERNAL_ENTRY_POINTS[name];

    expect(
      isLinked || Boolean(reason),
      `Route "${name}" has no link into it. Add a navigation entry, a button, or ` +
        `document it in EXTERNAL_ENTRY_POINTS with the reason a user arrives there.`,
    ).toBe(true);
  });
});

describe('no control is left disabled with nothing behind it', () => {
  it('has no permanently disabled buttons', () => {
    // `disabled` bound to state or a condition is fine; a bare `disabled` is a
    // control that can never do anything, which reads as broken to a user.
    // The Invite button shipped like this for weeks.
    const offenders: string[] = [];
    for (const path of readSources('src')) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/<(?:Async)?Button\b[^>]*?\sdisabled(?=[\s/>])[^>]*?>/gs)) {
        offenders.push(`${path}: ${match[0].slice(0, 70).replace(/\s+/g, ' ')}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
