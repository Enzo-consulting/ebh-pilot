/**
 * events/hooks/challengeHooks.ts — Challenge Domain Hooks
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
const log = (msg: string) => DEBUG && console.log(`[ChallengeHooks] ${msg}`);

async function onChallengeCompleted(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.CHALLENGE_COMPLETED);
    await grantXp({ organizationId: payload.organizationId, userId: payload.userId, xp, sourceEvent: DomainEvent.CHALLENGE_COMPLETED, sourceResource: 'Challenge', sourceResourceId: payload.resourceId });
    log(`XP granted: ${xp}`);
  } catch (err) { errors++; console.error('[ChallengeHooks] XP error:', err); }

  // Badge
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'challenges_completed', 1);
    log('Badges evaluated');
  } catch (err) { errors++; console.error('[ChallengeHooks] Badge error:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'CHALLENGE_COMPLETED', resourceType: 'Challenge', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[ChallengeHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.CHALLENGE_COMPLETED, Date.now() - start, errors > 0);
  log(`CHALLENGE_COMPLETED processed in ${Date.now() - start}ms`);
}

async function onChallengeStarted(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'CHALLENGE_STARTED', resourceType: 'Challenge', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[ChallengeHooks] Audit error:', err); }
  eventMetrics.recordListenerExecution('CHALLENGE_STARTED', Date.now() - start, errors > 0);
}

export function registerChallengeHooks(): void {
  eventBus.subscribe(DomainEvent.CHALLENGE_COMPLETED, onChallengeCompleted);
  if (DEBUG) console.log('[ChallengeHooks] Registered 1 hook');
}
