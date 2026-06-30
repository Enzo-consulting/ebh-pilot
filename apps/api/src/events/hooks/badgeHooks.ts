/**
 * events/hooks/badgeHooks.ts — Badge Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * BADGE_EARNED → Audit + Notification (Activity Feed is populated via DB by badgeEngine)
 *
 * NOTE: addActivityFeedEntry does not exist — activityFeedService is READ-ONLY.
 * The ActivityFeed is populated automatically via the UserBadge and ActivityFeedEvent
 * tables when badgeEngine.awardBadge() is called (which happens BEFORE this event).
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[BadgeHooks] ${msg}`);

async function onBadgeEarned(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // Audit — record badge award in audit trail
  try {
    await createAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: 'BADGE_EARNED',
      resourceType: 'Badge',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
    log(`Audit recorded for badge: ${payload.resourceId}`);
  } catch (err) {
    errors++;
    console.error('[BadgeHooks] Audit error:', err);
  }

  // Notification stub — will be implemented when notification service is ready
  // The badge info is available in payload.metadata.badgeName etc.
  log(`Badge earned notification stub: badge=${(payload.metadata?.badgeName as string) ?? payload.resourceId}`);

  eventMetrics.recordListenerExecution(DomainEvent.BADGE_EARNED, Date.now() - start, errors > 0);
  log(`BADGE_EARNED processed in ${Date.now() - start}ms`);
}

export function registerBadgeHooks(): void {
  eventBus.subscribe(DomainEvent.BADGE_EARNED, onBadgeEarned);
  if (DEBUG) console.log('[BadgeHooks] Registered 1 hook');
}
