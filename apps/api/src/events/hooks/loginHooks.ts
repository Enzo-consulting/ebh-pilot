/**
 * events/hooks/loginHooks.ts — Login/Session Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * LOGIN_SUCCESS → Daily login XP + Streak + Leaderboard
 * LOGIN_FAILED  → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { grantXp } from '../../progression/xpService.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[LoginHooks] ${msg}`);

// Daily login XP amount (configurable via settings in future)
const DAILY_LOGIN_XP = 5;

async function onLoginSuccess(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // Daily Login XP
  try {
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp: DAILY_LOGIN_XP,
      sourceEvent: DomainEvent.LOGIN_SUCCESS,
      sourceResource: 'Session',
      sourceResourceId: payload.resourceId,
    });
    log(`Daily login XP granted: ${DAILY_LOGIN_XP}`);
  } catch (err) { errors++; console.error('[LoginHooks] XP error:', err); }

  // Streak — update leaderboard (streak KPI)
  try {
    await computeLeaderboard(payload.organizationId, 'login_streak', 'monthly');
    log('Streak leaderboard updated');
  } catch (err) { errors++; console.error('[LoginHooks] Leaderboard error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.LOGIN_SUCCESS, Date.now() - start, errors > 0);
  log(`LOGIN_SUCCESS processed in ${Date.now() - start}ms`);
}

async function onLoginFailed(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'LOGIN_FAILED', resourceType: 'Session', resourceId: payload.resourceId, metadata: { ...payload.metadata, severity: 'warning' } });
  } catch (err) { errors++; console.error('[LoginHooks] Audit error:', err); }
  eventMetrics.recordListenerExecution(DomainEvent.LOGIN_FAILED, Date.now() - start, errors > 0);
}

export function registerLoginHooks(): void {
  eventBus.subscribe(DomainEvent.LOGIN_SUCCESS, onLoginSuccess);
  eventBus.subscribe(DomainEvent.LOGIN_FAILED, onLoginFailed);
  if (DEBUG) console.log('[LoginHooks] Registered 2 hooks');
}
