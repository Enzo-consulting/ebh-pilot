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
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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
    log('XP granted');
  } catch (err) { errorCount++; console.error('[ProspectHooks] XP:', err); }

  // 3. Badges
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'prospects_created', 1);
    log('Badges evaluated');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Badges:', err); }

  // 4. Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'prospects_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Leaderboard:', err); }

  // 5. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Prospect',
      resourceId: payload.resourceId,
      event: DomainEvent.PROSPECT_CREATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_CREATED, 'onProspectCreated', Date.now() - start, errorCount);
}

async function onProspectUpdated(payload: DomainEventPayload): Promise<void> {
  log(`PROSPECT_UPDATED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Prospect',
      resourceId: payload.resourceId,
      event: DomainEvent.PROSPECT_UPDATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Audit (update):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_UPDATED, 'onProspectUpdated', Date.now() - start, errorCount);
}

async function onProspectDeleted(payload: DomainEventPayload): Promise<void> {
  log(`PROSPECT_DELETED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Prospect',
      resourceId: payload.resourceId,
      event: DomainEvent.PROSPECT_DELETED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ProspectHooks] Audit (delete):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_DELETED, 'onProspectDeleted', Date.now() - start, errorCount);
}

export function registerProspectHooks(): void {
  eventBus.on(DomainEvent.PROSPECT_CREATED, onProspectCreated);
  eventBus.on(DomainEvent.PROSPECT_UPDATED, onProspectUpdated);
  eventBus.on(DomainEvent.PROSPECT_DELETED, onProspectDeleted);
}
