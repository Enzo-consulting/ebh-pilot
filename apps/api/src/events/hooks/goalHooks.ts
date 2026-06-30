/**
 * events/hooks/goalHooks.ts — Goal Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * GOAL_REACHED → XP + Badge + Challenge + Leaderboard + Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { grantXp, resolveXpAmount, XP_SETTING_KEYS } from '../../progression/xpService.js';
import { evaluateBadges } from '../../performance/badgeEngine.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[GoalHooks] ${msg}`);
}

async function onGoalReached(payload: DomainEventPayload): Promise<void> {
  log(`GOAL_REACHED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // 1. XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.GOAL_REACHED);
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp,
      sourceEvent: DomainEvent.GOAL_REACHED,
      sourceResource: 'Goal',
      sourceResourceId: payload.resourceId,
    });
    log('XP granted');
  } catch (err) { errorCount++; console.error('[GoalHooks] XP:', err); }

  // 2. Badges
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'goals_reached', 1);
    log('Badges evaluated');
  } catch (err) { errorCount++; console.error('[GoalHooks] Badges:', err); }

  // 3. Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'goals_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[GoalHooks] Leaderboard:', err); }

  // 4. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Goal',
      resourceId: payload.resourceId,
      event: DomainEvent.GOAL_REACHED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[GoalHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.GOAL_REACHED, 'onGoalReached', Date.now() - start, errorCount);
}

export function registerGoalHooks(): void {
  eventBus.on(DomainEvent.GOAL_REACHED, onGoalReached);
}
