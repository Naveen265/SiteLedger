import { describe, expect, it } from 'vitest';
import { COMPANY_NAV, PROJECT_NAV, SITE_NAV, navItemsForRole } from './navigation';
import { ROLES } from '@/types/enums';

/**
 * A screen with a route but no navigation entry is invisible: it exists, and
 * nobody can reach it by clicking. That happened to the team screen, and
 * walking routes by URL could never have caught it. These tests assert every
 * screen an owner needs is actually reachable.
 */
describe('office navigation', () => {
  it('gives an owner a way to reach team management', () => {
    const owner = navItemsForRole(COMPANY_NAV, 'owner');
    expect(owner.some((item) => item.to('') === '/company/users')).toBe(true);
  });

  it('does not offer team management to anyone else', () => {
    for (const role of ROLES.filter((r) => r !== 'owner')) {
      const items = navItemsForRole(COMPANY_NAV, role);
      expect(items.some((item) => item.to('') === '/company/users'), role).toBe(false);
    }
  });

  it('gives every role somewhere to land', () => {
    for (const role of ROLES) {
      const reachable =
        navItemsForRole(COMPANY_NAV, role).length + navItemsForRole(PROJECT_NAV, role).length;
      expect(reachable, role).toBeGreaterThan(0);
    }
  });

  it('keeps the site tab bar within thumb reach', () => {
    // More than five destinations stops being tappable on a phone.
    expect(SITE_NAV.length).toBeLessThanOrEqual(5);
  });

  it('labels every entry through the message files, never a literal', () => {
    for (const item of [...COMPANY_NAV, ...PROJECT_NAV, ...SITE_NAV]) {
      expect(item.labelKey).toMatch(/^[a-z]+\./);
    }
  });
});
