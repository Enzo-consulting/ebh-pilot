/**
 * events/hooks/notificationHooks.ts — Cross-domain Notification Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * Consolidates all notification-triggering events in one place.
 * Subscribes to key events that require user notification.
 *
 * Events handled:
 * - PROSPECT_CREATED  → Notify manager/assignee
 * - CLIENT_CREATED    → Notify manager
 * - BADGE_EARNED      → Notify user
 * - USER_LEVEL_UP     → Notify user
 * - CHALLENGE_COMPLETED → Notify user + manager
 * - GOAL_REACHED      → Notify user + manager
 *
 * NOTE: Notifications are logged to console (stub).
 * Real notification sending (email/push/SMS) will be implemented
 * in the NotificationListener (events/listeners/index.ts) in a future ticket.
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[NotificationHooks] ${msg}`);

/**
 * Generic notification stub.
 * Replace with actual notification service call when available.
 */
async function sendNotification(
  type: string,
  organizationId: string,
  userId: string,
  payload: DomainEventPayload
): Promise<void> {
  // TODO: Call notification service (email, push, SMS) when implemented
  // For now, just log in debug mode
  log(`Notification queued: type=${type} org=${organizationId} user=${userId} resource=${payload.resourceId}`);
}

async function notifyOnProspectCreated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await sendNotification('prospect_created', payload.organizationId, payload.userId, payload);
  } catch (err) { errors++; console.error('[NotificationHooks] Error:', err); }
  eventMetrics.recordListenerExecution('NOTIFICATION:PROSPECT_CREATED', Date.now() - start, errors > 0);
}

async function notifyOnClientCreated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await sendNotification('client_created', payload.organizationId, payload.userId, payload);
  } catch (err) { errors++; console.error('[NotificationHooks] Error:', err); }
  eventMetrics.recordListenerExecution('NOTIFICATION:CLIENT_CREATED', Date.now() - start, errors > 0);
}

async function notifyOnBadgeEarned(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await sendNotification('badge_earned', payload.organizationId, payload.userId, payload);
  } catch (err) { errors++; console.error('[NotificationHooks] Error:', err); }
  eventMetrics.recordListenerExecution('NOTIFICATION:BADGE_EARNED', Date.now() - start, errors > 0);
}

async function notifyOnLevelUp(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await sendNotification('level_up', payload.organizationId, payload.userId, payload);
  } catch (err) { errors++; console.error('[NotificationHooks] Error:', err); }
  eventMetrics.recordListenerExecution('NOTIFICATION:USER_LEVEL_UP', Date.now() - start, errors > 0);
}

async function notifyOnChallengeCompleted(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await sendNotification('challenge_completed', payload.organizationId, payload.userId, payload);
  } catch (err) { errors++; console.error('[NotificationHooks] Error:', err); }
  eventMetrics.recordListenerExecution('NOTIFICATION:CHALLENGE_COMPLETED', Date.now() - start, errors > 0);
}

async function notifyOnGoalReached(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await sendNotification('goal_reached', payload.organizationId, payload.userId, payload);
  } catch (err) { errors++; console.error('[NotificationHooks] Error:', err); }
  eventMetrics.recordListenerExecution('NOTIFICATION:GOAL_REACHED', Date.now() - start, errors > 0);
}

export function registerNotificationHooks(): void {
  eventBus.subscribe(DomainEvent.PROSPECT_CREATED, notifyOnProspectCreated);
  eventBus.subscribe(DomainEvent.CLIENT_CREATED, notifyOnClientCreated);
  eventBus.subscribe(DomainEvent.BADGE_EARNED, notifyOnBadgeEarned);
  eventBus.subscribe(DomainEvent.USER_LEVEL_UP, notifyOnLevelUp);
  eventBus.subscribe(DomainEvent.CHALLENGE_COMPLETED, notifyOnChallengeCompleted);
  eventBus.subscribe(DomainEvent.GOAL_REACHED, notifyOnGoalReached);
  if (DEBUG) console.log('[NotificationHooks] Registered 6 hooks');
    }
