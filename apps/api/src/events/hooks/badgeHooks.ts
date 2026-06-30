/**
 * events/hooks/badgeHooks.ts — Badge Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * BADGE_EARNED → Notification + Activity Feed + Dashboard
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { createAudit } from '../../audit/auditService.js';
import { addActivityFeedEntry } from '../../dashboard/activityFeedService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[BadgeHooks] ${msg}`);

async function onBadgeEarned(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // Activity Feed
  try {
    await addActivityFeedEntry({
      organizationId: payload.organizationId,
      userId: payload.userId,
      type: 'badge_earned',
      title: 'Badge obtenu',
      description: `Badge obtenu: ${(payload.metadata?.badgeName as string) ?? payload.resourceId}`,
      resourceType: 'Badge',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
    log('Activity feed updated');
  } catch (err) { errors++; console.error('[BadgeHooks] ActivityFeed error:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'BADGE_EARNED', resourceType: 'Badge', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[BadgeHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.BADGE_EARNED, Date.now() - start, errors > 0);
  log(`BADGE_EARNED processed in ${Date.now() - start}ms`);
}

export function registerBadgeHooks(): void {
  eventBus.subscribe(DomainEvent.BADGE_EARNED, onBadgeEarned);
  if (DEBUG) console.log('[BadgeHooks] Registered 1 hook');
}
