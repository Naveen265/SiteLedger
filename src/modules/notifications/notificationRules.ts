import { DEFAULT_QUIET_HOURS } from '@/config/constants';
import type { Priority } from '@/types/enums';

/**
 * The anti-spam rules, written as code rather than intentions.
 * A product that notifies everyone about everything trains its users to
 * ignore it, so these rules are enforced, not documented.
 */

export type NotificationEvent = {
  kind: string;
  /** Who the event is about, used to suppress notifying a user of their own action. */
  actorProfileId: string;
  recipientProfileId: string;
  /** True when the recipient is the assignee or the owner of the item. */
  isDirectlyResponsible: boolean;
  priority?: Priority;
};

export type NotificationRouting = {
  /** Whether the recipient is notified at all. */
  shouldNotify: boolean;
  /** Real time push, or held for the next digest. */
  urgency: 'realtime' | 'digest';
  reason: string;
};

/** Event kinds that are informational and always batched into a digest. */
const NON_URGENT_KINDS = new Set([
  'dpr.submitted',
  'material.received',
  'po.created',
  'expense.submitted',
]);

/** Whether the current local hour falls inside the recipient's quiet hours. */
export function isWithinQuietHours(
  now: Date = new Date(),
  quietHours = DEFAULT_QUIET_HOURS,
): boolean {
  const hour = now.getHours();
  // Quiet hours wrap past midnight, so the comparison is an OR, not an AND.
  return hour >= quietHours.startHour || hour < quietHours.endHour;
}

/**
 * Decides whether and how a recipient hears about an event.
 * Rule 1: only people who own or must act on the item are notified, with one
 *         exception for critical and high priority escalations.
 * Rule 2: non urgent events are batched into a digest.
 * Rule 3: only critical or high priority, or a direct assignment, pushes live.
 * Rule 4: a user is never notified of their own action.
 * Rule 5: quiet hours hold back everything that is not real time.
 */
export function routeNotification(
  event: NotificationEvent,
  now: Date = new Date(),
  quietHours = DEFAULT_QUIET_HOURS,
): NotificationRouting {
  if (event.actorProfileId === event.recipientProfileId) {
    return { shouldNotify: false, urgency: 'digest', reason: 'own_action' };
  }

  // Rule 1 has one deliberate exception: a critical or high priority event
  // reaches the people above the assignee, because escalation is precisely the
  // case where someone who is not the assignee has to be told.
  const isEscalation = event.priority === 'critical' || event.priority === 'high';

  if (!event.isDirectlyResponsible && !isEscalation && !NON_URGENT_KINDS.has(event.kind)) {
    return { shouldNotify: false, urgency: 'digest', reason: 'not_responsible' };
  }

  if (NON_URGENT_KINDS.has(event.kind)) {
    return { shouldNotify: true, urgency: 'digest', reason: 'non_urgent_batched' };
  }

  const isUrgent = event.isDirectlyResponsible || isEscalation;

  if (!isUrgent) {
    return { shouldNotify: true, urgency: 'digest', reason: 'low_priority_batched' };
  }

  if (isWithinQuietHours(now, quietHours)) {
    return { shouldNotify: true, urgency: 'digest', reason: 'quiet_hours' };
  }

  return { shouldNotify: true, urgency: 'realtime', reason: 'urgent_direct' };
}
