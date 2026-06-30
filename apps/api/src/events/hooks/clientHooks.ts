/**
 * events/hooks/clientHooks.ts — Client Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * CLIENT_CREATED → KPI + XP + Badges + Leaderboard + Audit
 * CLIENT_UPDATED → Audit
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
  if (DEBUG) console.log(`[ClientHooks] ${msg}`);
}

async function onClientCreated(payload: DomainEventPayload): Promise<void> {
  log(`CLIENT_CREATED org=${payload.organizationId} user=${payload.userId}`);
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
      kpiCode: 'clients_created',
      value: 1,
      periodStart,
      periodEnd,
      source: DomainEvent.CLIENT_CREATED,
      metadata: { resourceId: payload.resourceId },
    });
    log('KPI updated');
  } catch (err) { errorCount++; console.error('[ClientHooks] KPI:', err); }

  // 2. XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.CLIENT_CREATED);
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp,
      sourceEvent: DomainEvent.CLIENT_CREATED,
      sourceResource: 'Client',
      sourceResourceId: payload.resourceId,
    });
    log('XP granted');
  } catch (err) { errorCount++; console.error('[ClientHooks] XP:', err); }

  // 3. Badges
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'clients_created', 1);
    log('Badges evaluated');
  } catch (err) { errorCount++; console.error('[ClientHooks] Badges:', err); }

  // 4. Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'clients_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[ClientHooks] Leaderboard:', err); }

  // 5. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Client',
      resourceId: payload.resourceId,
      event: DomainEvent.CLIENT_CREATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ClientHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.CLIENT_CREATED, 'onClientCreated', Date.now() - start, errorCount);
}

async function onClientUpdated(payload: DomainEventPayload): Promise<void> {
  log(`CLIENT_UPDATED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Client',
      resourceId: payload.resourceId,
      event: DomainEvent.CLIENT_UPDATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ClientHooks] Audit (update):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.CLIENT_UPDATED, 'onClientUpdated', Date.now() - start, errorCount);
}

export function registerClientHooks(): void {
  eventBus.on(DomainEvent.CLIENT_CREATED, onClientCreated);
  eventBus.on(DomainEvent.CLIENT_UPDATED, onClientUpdated);
}
