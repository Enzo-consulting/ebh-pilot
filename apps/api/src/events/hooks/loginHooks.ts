/**
 * events/hooks/loginHooks.ts — Login Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * LOGIN_SUCCESS → Daily XP + Streak + Leaderboard + Audit
 * LOGIN_FAILURE → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { grantXp, resolveXpAmount, XP_SETTING_KEYS } from '../../progression/xpService.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[LoginHooks] ${msg}`);
}

async function onLoginSuccess(payload: DomainEventPayload): Promise<void> {
  log(`LOGIN_SUCCESS org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // 1. Daily Login XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.LOGIN_SUCCESS);
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp,
      sourceEvent: DomainEvent.LOGIN_SUCCESS,
      sourceResource: 'Login',
      sourceResourceId: payload.resourceId ?? payload.userId,
    });
    log('Daily XP granted');
  } catch (err) { errorCount++; console.error('[LoginHooks] XP:', err); }

  // 2. Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'logins_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[LoginHooks] Leaderboard:', err); }

  // 3. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Session',
      resourceId: payload.resourceId ?? payload.userId,
      event: DomainEvent.LOGIN_SUCCESS,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[LoginHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.LOGIN_SUCCESS, 'onLoginSuccess', Date.now() - start, errorCount);
}

async function onLoginFailure(payload: DomainEventPayload): Promise<void> {
  log(`LOGIN_FAILURE org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Session',
      resourceId: payload.resourceId ?? payload.userId ?? 'unknown',
      event: DomainEvent.LOGIN_FAILURE,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[LoginHooks] Audit (failure):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.LOGIN_FAILURE, 'onLoginFailure', Date.now() - start, errorCount);
}

export function registerLoginHooks(): void {
  eventBus.on(DomainEvent.LOGIN_SUCCESS, onLoginSuccess);
  eventBus.on(DomainEvent.LOGIN_FAILURE, onLoginFailure);
}
