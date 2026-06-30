/**
 * events/hooks/goalHooks.ts — Goal Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * GOAL_REACHED → XP + Badge + Leaderboard + Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { grantXp, resolveXpAmount, XP_SETTING_KEYS } from '../../progression/xpService.js';
import { evaluateBadges } from '../../performance/badgeEngine.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[GoalHooks] ${msg}`);

async function onGoalReached(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.GOAL_REACHED);
    await grantXp({ organizationId: payload.organizationId, userId: payload.userId, xp, sourceEvent: DomainEvent.GOAL_REACHED, sourceResource: 'Goal', sourceResourceId: payload.resourceId });
    log(`XP granted: ${xp}`);
  } catch (err) { errors++; console.error('[GoalHooks] XP error:', err); }

  // Badge
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'goals_reached', 1);
    log('Badges evaluated');
  } catch (err) { errors++; console.error('[GoalHooks] Badge error:', err); }

  // Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'goals_reached', 'monthly');
    log('Leaderboard updated');
  } catch (err) { errors++; console.error('[GoalHooks] Leaderboard error:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'GOAL_REACHED', resourceType: 'Goal', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[GoalHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.GOAL_REACHED, Date.now() - start, errors > 0);
  log(`GOAL_REACHED processed in ${Date.now() - start}ms`);
}

export function registerGoalHooks(): void {
  eventBus.subscribe(DomainEvent.GOAL_REACHED, onGoalReached);
  if (DEBUG) console.log('[GoalHooks] Registered 1 hook');
}
