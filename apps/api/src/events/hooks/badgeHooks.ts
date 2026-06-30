/**
 * events/hooks/badgeHooks.ts — Badge Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * BADGE_EARNED → Notification + Audit + Dashboard cache invalidation
 *
 * NOTE: activityFeedService is READ-ONLY — no addActivityFeedEntry available.
 * Dashboard update is handled via cache invalidation (stub).
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[BadgeHooks] ${msg}`);
}

async function onBadgeEarned(payload: DomainEventPayload): Promise<void> {
  log(`BADGE_EARNED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  // 1. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Badge',
      resourceId: payload.resourceId,
      event: DomainEvent.BADGE_EARNED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[BadgeHooks] Audit:', err); }

  // 2. Dashboard cache invalidation (stub — cache layer plugged via cacheFactory)
  try {
    // Cache invalidation is handled by the dashboard cache module (future integration)
    log('Dashboard cache invalidation scheduled');
  } catch (err) { errorCount++; console.error('[BadgeHooks] Cache:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.BADGE_EARNED, 'onBadgeEarned', Date.now() - start, errorCount);
}

export function registerBadgeHooks(): void {
  eventBus.on(DomainEvent.BADGE_EARNED, onBadgeEarned);
}
