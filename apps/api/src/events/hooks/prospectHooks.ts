/**
 * events/hooks/prospectHooks.ts — Prospect Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PROSPECT_CREATED → KPI + XP + Badges + Leaderboard + Audit
 * PROSPECT_UPDATED → Audit
 * PROSPECT_DELETED → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { recordKpiValue } from '../../performance/performanceEngine.js';
import { grantXp, resolveXpAmount, XP_SETTING_KEYS } from '../../progression/xpService.js';
import { evaluateBadges } from '../../performance/badgeEngine.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[ProspectHooks] ${msg}`);
}

async function onProspectCreated(payload: DomainEventPayload): Promise<void> {
  log(`PROSPECT_CREATED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of month

  // 1. KPI
  try {
    await recordKpiValue({
      userId: payload.userId,
      organizationId: payload.organizationId,
      kpiCode: 'prospects_created',
      value: 1,
      periodStart,
      periodEnd,
      source: DomainEvent.PROSPECT_CREATED,
      metadata: { resourceId: payload.resourceId },
    });
    log('KPI updated');
  } catch (err) { errorCount++; console.error('[ProspectHooks] KPI:', err); }

  // 2. XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.PROSPECT_CREATED);
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp,
      sourceEvent: DomainEvent.PROSPECT_CREATED,
      sourceResource: 'Prospect',
      sourceResourceId: payload.resourceId,
    });
    log(`XP granted: ${xp}`);
  } catch (err) { errorCount++; console.error('[ProspectHooks] XP:', err); }

  // 3. Badges
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'prospects_created', 1);
    log('Badges evaluated');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Badge:', err); }

  // 4. Leaderboard — recompute monthly leaderboard for prospects
  try {
    await computeLeaderboard(payload.organizationId, 'prospects_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Leaderboard:', err); }

  // 5. Audit
  try {
    await createAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: 'PROSPECT_CREATED',
      resourceType: 'Prospect',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
    log('Audit recorded');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Audit:', err); }

  const duration = Date.now() - start;
  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_CREATED, duration, errorCount > 0);
  log(`PROSPECT_CREATED done in ${duration}ms, errors: ${errorCount}`);
}

async function onProspectUpdated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'PROSPECT_UPDATED', resourceType: 'Prospect', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[ProspectHooks] Audit (update):', err); }
  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_UPDATED, Date.now() - start, errors > 0);
}

async function onProspectDeleted(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'PROSPECT_DELETED', resourceType: 'Prospect', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[ProspectHooks] Audit (delete):', err); }
  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_DELETED, Date.now() - start, errors > 0);
}

export function registerProspectHooks(): void {
  eventBus.subscribe(DomainEvent.PROSPECT_CREATED, onProspectCreated);
  eventBus.subscribe(DomainEvent.PROSPECT_UPDATED, onProspectUpdated);
  eventBus.subscribe(DomainEvent.PROSPECT_DELETED, onProspectDeleted);
  if (DEBUG) console.log('[ProspectHooks] Registered 3 hooks');
}
