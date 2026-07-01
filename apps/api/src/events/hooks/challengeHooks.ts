/**
 * events/hooks/challengeHooks.ts — Challenge Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * CHALLENGE_COMPLETED → XP + Badge + Notification + Audit
 * CHALLENGE_STARTED   → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { grantXp, resolveXpAmount, XP_SETTING_KEYS } from '../../progression/xpService.js';
import { evaluateBadges } from '../../performance/badgeEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[ChallengeHooks] ${msg}`);
}

async function onChallengeCompleted(payload: DomainEventPayload): Promise<void> {
  log(`CHALLENGE_COMPLETED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  // 1. XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.CHALLENGE_COMPLETED);
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp,
      sourceEvent: DomainEvent.CHALLENGE_COMPLETED,
      sourceResource: 'Challenge',
      sourceResourceId: payload.resourceId,
    });
    log('XP granted');
  } catch (err) { errorCount++; console.error('[ChallengeHooks] XP:', err); }

  // 2. Badges
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'challenges_completed', 1);
    log('Badges evaluated');
  } catch (err) { errorCount++; console.error('[ChallengeHooks] Badges:', err); }

  // 3. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Challenge',
      resourceId: payload.resourceId,
      event: DomainEvent.CHALLENGE_COMPLETED,
      occurredAt: payload.occurredAt,
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ChallengeHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.CHALLENGE_COMPLETED, Date.now() - start, errorCount > 0);
}

async function onChallengeStarted(payload: DomainEventPayload): Promise<void> {
  log(`CHALLENGE_STARTED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Challenge',
      resourceId: payload.resourceId,
      event: DomainEvent.CHALLENGE_STARTED,
      occurredAt: payload.occurredAt,
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ChallengeHooks] Audit (started):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.CHALLENGE_STARTED, Date.now() - start, errorCount > 0);
}

export function registerChallengeHooks(): void {
  eventBus.subscribe(DomainEvent.CHALLENGE_COMPLETED, onChallengeCompleted);
  eventBus.subscribe(DomainEvent.CHALLENGE_STARTED, onChallengeStarted);
}
