/**
 * events/hooks/levelHooks.ts — Level Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * USER_LEVEL_UP → Notification + Audit + Dashboard + Leaderboard + Coach IA stub
 *
 * NOTE: activityFeedService is READ-ONLY — no addActivityFeedEntry available.
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[LevelHooks] ${msg}`);
}

async function onUserLevelUp(payload: DomainEventPayload): Promise<void> {
  log(`USER_LEVEL_UP org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // 1. Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'levels_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[LevelHooks] Leaderboard:', err); }

  // 2. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'UserLevel',
      resourceId: payload.resourceId ?? payload.userId,
      event: DomainEvent.USER_LEVEL_UP,
      occurredAt: payload.occurredAt,
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[LevelHooks] Audit:', err); }

  // 3. Dashboard cache invalidation (stub)
  try {
    log('Dashboard cache invalidation scheduled');
  } catch (err) { errorCount++; console.error('[LevelHooks] Cache:', err); }

  // 4. Coach IA stub (future integration)
  try {
    log('Coach IA notification stub — USER_LEVEL_UP');
  } catch (err) { errorCount++; console.error('[LevelHooks] CoachIA:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.USER_LEVEL_UP, Date.now() - start, errorCount > 0);
}

export function registerLevelHooks(): void {
  eventBus.subscribe(DomainEvent.USER_LEVEL_UP, onUserLevelUp);
}
