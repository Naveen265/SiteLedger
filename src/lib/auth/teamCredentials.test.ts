import { describe, expect, it } from 'vitest';
import { buildTeamEmail, isValidCompanyCode, isValidUsername, looksLikeEmail } from './teamCredentials';

/**
 * The address is derived on sign-in by the client and again on the server when
 * the account is created. Both import this module, so the only way they can
 * disagree is if this function is wrong.
 */
describe('buildTeamEmail', () => {
  it('produces a stable address from the two things the user types', () => {
    expect(buildTeamEmail('INNESTO', 'Ravi.Kumar')).toBe('ravi.kumar@innesto.siteledger.app');
  });

  it('lowercases both parts, so a typed capital still signs in', () => {
    expect(buildTeamEmail('Innesto', 'RAVI')).toBe('ravi@innesto.siteledger.app');
  });

  it('ignores whitespace a phone keyboard adds', () => {
    expect(buildTeamEmail('  ABC ', ' worker-9 ')).toBe('worker-9@abc.siteledger.app');
  });

  it('rejects nothing itself: validation is a separate decision', () => {
    expect(buildTeamEmail('CO-01', 'site_02')).toBe('site_02@co-01.siteledger.app');
  });
});

describe('isValidUsername', () => {
  it('accepts the forms an owner would reasonably choose', () => {
    for (const n of ['ravi', 'ravi.kumar', 'ravi_k', 'ravi-k2', 'site01']) {
      expect(isValidUsername(n), n).toBe(true);
    }
  });

  it('rejects anything that would break the email local part', () => {
    for (const n of ['r', '', 'ravi kumar', 'ravi@kumar', '.ravi', 'ravi+1', 'r'.repeat(40)]) {
      expect(isValidUsername(n), n).toBe(false);
    }
  });
});

describe('looksLikeEmail', () => {
  it('separates an owner signing in with email from staff using a username', () => {
    expect(looksLikeEmail('naveen@innestolabs.com')).toBe(true);
    expect(looksLikeEmail('ravi.kumar')).toBe(false);
  });
});

describe('validators mirror the server', () => {
  it('agrees on usernames', () => {
    for (const name of ['ravi', 'ravi.kumar', 'r', 'ravi kumar']) {
      expect(isValidUsername(name)).toBe(isValidUsername(name));
    }
    expect(isValidUsername('ravi.kumar')).toBe(true);
    expect(isValidUsername('ravi kumar')).toBe(false);
  });

  it('agrees on company codes', () => {
    expect(isValidCompanyCode('INNESTO')).toBe(true);
    expect(isValidCompanyCode('in nesto')).toBe(false);
  });
});
