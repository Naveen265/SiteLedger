import { describe, expect, it } from 'vitest';
import { isWithinQuietHours, routeNotification } from './notificationRules';

/**
 * The anti-spam rules exist as code, and these tests are what keep them real.
 * A product that notifies everyone about everything teaches people to ignore it.
 */

const BASE = {
  kind: 'issue.assigned',
  actorProfileId: 'actor',
  recipientProfileId: 'recipient',
  isDirectlyResponsible: true,
};

// Mid afternoon, comfortably outside the default quiet hours.
const DAYTIME = new Date('2026-08-31T14:00:00');
// Late evening, inside the default 21:00 to 06:00 quiet window.
const NIGHT = new Date('2026-08-31T22:30:00');

describe('routeNotification', () => {
  it('never notifies a user about their own action', () => {
    const routing = routeNotification(
      { ...BASE, actorProfileId: 'recipient' },
      DAYTIME,
    );
    expect(routing.shouldNotify).toBe(false);
    expect(routing.reason).toBe('own_action');
  });

  it('does not notify someone who neither owns nor must act on the item', () => {
    const routing = routeNotification(
      { ...BASE, isDirectlyResponsible: false },
      DAYTIME,
    );
    expect(routing.shouldNotify).toBe(false);
    expect(routing.reason).toBe('not_responsible');
  });

  it('batches non urgent events into a digest even for the responsible person', () => {
    const routing = routeNotification({ ...BASE, kind: 'dpr.submitted' }, DAYTIME);
    expect(routing.shouldNotify).toBe(true);
    expect(routing.urgency).toBe('digest');
  });

  it('pushes a direct assignment in real time', () => {
    const routing = routeNotification(BASE, DAYTIME);
    expect(routing.shouldNotify).toBe(true);
    expect(routing.urgency).toBe('realtime');
  });

  it('pushes a critical event in real time', () => {
    const routing = routeNotification(
      { ...BASE, isDirectlyResponsible: false, kind: 'issue.escalated', priority: 'critical' },
      DAYTIME,
    );
    expect(routing.urgency).toBe('realtime');
  });

  it('holds an urgent event for the digest during quiet hours', () => {
    const routing = routeNotification(BASE, NIGHT);
    expect(routing.shouldNotify).toBe(true);
    expect(routing.urgency).toBe('digest');
    expect(routing.reason).toBe('quiet_hours');
  });
});

describe('isWithinQuietHours', () => {
  it('covers the window that wraps past midnight', () => {
    expect(isWithinQuietHours(new Date('2026-08-31T22:00:00'))).toBe(true);
    expect(isWithinQuietHours(new Date('2026-08-31T03:00:00'))).toBe(true);
    expect(isWithinQuietHours(new Date('2026-08-31T12:00:00'))).toBe(false);
  });
});
