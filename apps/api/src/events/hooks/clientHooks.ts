/**
 * events/hooks/clientHooks.ts — Client Domain Hooks
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
const log = (msg: string) => DEBUG && console.log(`[ClientHooks] ${msg}`);

async function onClientCreated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // KPI
  try {
    await recordKpiValue({ organizationId: payload.organizationId, userId: payload.userId, kpiCode: 'clients_created', value: 1, period: 'daily', sourceEvent: DomainEvent.CLIENT_CREATED, sourceResourceId: payload.resourceId });
    log('KPI updated');
  } catch (err) { errors++; console.error('[ClientHooks] KPI error:', err); }

  // XP
  try {
    const xp = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.CLIENT_CREATED);
    await grantXp({ organizationId: payload.organizationId, userId: payload.userId, xp, sourceEvent: DomainEvent.CLIENT_CREATED, sourceResource: 'Client', sourceResourceId: payload.resourceId });
    log(`XP granted: ${xp}`);
  } catch (err) { errors++; console.error('[ClientHooks] XP error:', err); }

  // Badges
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'clients_created', 1);
  } catch (err) { errors++; console.error('[ClientHooks] Badge error:', err); }

  // Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'clients_created', 'monthly');
  } catch (err) { errors++; console.error('[ClientHooks] Leaderboard error:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'CLIENT_CREATED', resourceType: 'Client', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[ClientHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.CLIENT_CREATED, Date.now() - start, errors > 0);
  log(`CLIENT_CREATED processed in ${Date.now() - start}ms`);
}

async function onClientUpdated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'CLIENT_UPDATED', resourceType: 'Client', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[ClientHooks] Audit (update) error:', err); }
  eventMetrics.recordListenerExecution(DomainEvent.CLIENT_UPDATED, Date.now() - start, errors > 0);
}

export function registerClientHooks(): void {
  eventBus.subscribe(DomainEvent.CLIENT_CREATED, onClientCreated);
  eventBus.subscribe(DomainEvent.CLIENT_UPDATED, onClientUpdated);
  if (DEBUG) console.log('[ClientHooks] Registered 2 hooks');
}
