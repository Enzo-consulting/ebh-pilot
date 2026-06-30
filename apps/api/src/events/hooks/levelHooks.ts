/**
 * events/hooks/levelHooks.ts — Level/Progression Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * USER_LEVEL_UP → Leaderboard + Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[LevelHooks] ${msg}`);

async function onUserLevelUp(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), 0, 1); // Start of year (all-time ~ yearly)
  const periodEnd = new Date(now.getFullYear() + 1, 0, 0); // End of year

  // Leaderboard — update user level rankings
  try {
    await computeLeaderboard(payload.organizationId, 'user_levels_alltime', periodStart, periodEnd);
    log('Leaderboard updated');
  } catch (err) {
    errors++;
    console.error('[LevelHooks] Leaderboard:', err);
  }

  // Audit — record level promotion
  try {
    await createAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: 'USER_LEVEL_UP',
      resourceType: 'Level',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
    log(`Audit: level up to ${(payload.metadata?.newLevel as number) ?? '?'}`);
  } catch (err) {
    errors++;
    console.error('[LevelHooks] Audit:', err);
  }

  log(`Level up notification stub: user=${payload.userId} newLevel=${(payload.metadata?.newLevel as number) ?? '?'}`);

  eventMetrics.recordListenerExecution(DomainEvent.USER_LEVEL_UP, Date.now() - start, errors > 0);
  log(`USER_LEVEL_UP done in ${Date.now() - start}ms`);
}

export function registerLevelHooks(): void {
  eventBus.subscribe(DomainEvent.USER_LEVEL_UP, onUserLevelUp);
  if (DEBUG) console.log('[LevelHooks] Registered 1 hook');
}
