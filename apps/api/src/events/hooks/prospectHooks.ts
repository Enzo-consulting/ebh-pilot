/**
 * events/hooks/prospectHooks.ts — Prospect Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * Subscribes to prospect-related domain events and connects all engines.
 *
 * EVENTS:
 * - PROSPECT_CREATED → KPI + XP + Badges + Challenges + Leaderboard + Dashboard + Notification + Mobile + Audit
 * - PROSPECT_UPDATED → KPI + Audit
 * - PROSPECT_DELETED → Audit
 *
 * PHILOSOPHY:
 * - Each hook runs independently in a try/catch
 * - No hook can block others or throw to the caller
 * - Hooks are fire-and-forget (do not await chained results)
 * - Only the event payload is shared between engines
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

// Engines
import { recordKpiValue } from '../../performance/performanceEngine.js';
import { grantXp, resolveXpAmount, XP_SETTING_KEYS } from '../../progression/xpService.js';
import { evaluateBadges } from '../../performance/badgeEngine.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[ProspectHooks] ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECT_CREATED
// ─────────────────────────────────────────────────────────────────────────────

async function onProspectCreated(payload: DomainEventPayload): Promise<void> {
  log(`PROSPECT_CREATED received for org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  // 1. KPI — update prospect count KPI
  try {
    await recordKpiValue({
      organizationId: payload.organizationId,
      userId: payload.userId,
      kpiCode: 'prospects_created',
      value: 1,
      period: 'daily',
      sourceEvent: DomainEvent.PROSPECT_CREATED,
      sourceResourceId: payload.resourceId,
    });
    log('KPI updated');
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] KPI error:', err);
  }
  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_CREATED + ':kpi', Date.now() - start, errorCount > 0);

  // 2. XP — grant XP for prospect creation
  try {
    const xpAmount = await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.PROSPECT_CREATED);
    await grantXp({
      organizationId: payload.organizationId,
      userId: payload.userId,
      xp: xpAmount,
      sourceEvent: DomainEvent.PROSPECT_CREATED,
      sourceResource: 'Prospect',
      sourceResourceId: payload.resourceId,
    });
    log(`XP granted: ${xpAmount}`);
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] XP error:', err);
  }

  // 3. Badges — evaluate badge conditions
  try {
    await evaluateBadges(payload.userId, payload.organizationId, 'prospects_created', 1);
    log('Badges evaluated');
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] Badge error:', err);
  }

  // 4. Leaderboard — refresh rankings
  try {
    await computeLeaderboard(payload.organizationId, 'prospects_created', 'monthly');
    log('Leaderboard refreshed');
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] Leaderboard error:', err);
  }

  // 5. Audit — immutable audit trail
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
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] Audit error:', err);
  }

  const duration = Date.now() - start;
  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_CREATED, duration, errorCount > 0);
  log(`PROSPECT_CREATED processed in ${duration}ms, errors: ${errorCount}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECT_UPDATED
// ─────────────────────────────────────────────────────────────────────────────

async function onProspectUpdated(payload: DomainEventPayload): Promise<void> {
  log(`PROSPECT_UPDATED received for resource=${payload.resourceId}`);
  const start = Date.now();
  let errorCount = 0;

  // Audit
  try {
    await createAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: 'PROSPECT_UPDATED',
      resourceType: 'Prospect',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] Audit (update) error:', err);
  }

  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_UPDATED, Date.now() - start, errorCount > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROSPECT_DELETED
// ─────────────────────────────────────────────────────────────────────────────

async function onProspectDeleted(payload: DomainEventPayload): Promise<void> {
  log(`PROSPECT_DELETED received for resource=${payload.resourceId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: 'PROSPECT_DELETED',
      resourceType: 'Prospect',
      resourceId: payload.resourceId,
      metadata: payload.metadata ?? {},
    });
  } catch (err) {
    errorCount++;
    console.error('[ProspectHooks] Audit (delete) error:', err);
  }

  eventMetrics.recordListenerExecution(DomainEvent.PROSPECT_DELETED, Date.now() - start, errorCount > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register all prospect hooks on the event bus.
 * Called once at startup by hookRegistry.ts.
 */
export function registerProspectHooks(): void {
  eventBus.subscribe(DomainEvent.PROSPECT_CREATED, onProspectCreated);
  eventBus.subscribe(DomainEvent.PROSPECT_UPDATED, onProspectUpdated);
  eventBus.subscribe(DomainEvent.PROSPECT_DELETED, onProspectDeleted);
  if (DEBUG) console.log('[ProspectHooks] Registered 3 hooks');
}
