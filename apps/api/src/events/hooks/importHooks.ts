/**
 * events/hooks/importHooks.ts — Import Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * IMPORT_COMPLETED → KPI + Leaderboard + Dashboard + Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { recordKpiValue } from '../../performance/performanceEngine.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[ImportHooks] ${msg}`);
}

async function onImportCompleted(payload: DomainEventPayload): Promise<void> {
  log(`IMPORT_COMPLETED org=${payload.organizationId} user=${payload.userId}`);
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
      kpiCode: 'imports_completed',
      value: 1,
      periodStart,
      periodEnd,
      source: DomainEvent.IMPORT_COMPLETED,
      metadata: { resourceId: payload.resourceId },
    });
    log('KPI updated');
  } catch (err) { errorCount++; console.error('[ImportHooks] KPI:', err); }

  // 2. Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'imports_monthly', periodStart, periodEnd);
    log('Leaderboard refreshed');
  } catch (err) { errorCount++; console.error('[ImportHooks] Leaderboard:', err); }

  // 3. Dashboard cache invalidation (stub)
  try {
    log('Dashboard cache invalidation scheduled');
  } catch (err) { errorCount++; console.error('[ImportHooks] Cache:', err); }

  // 4. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Import',
      resourceId: payload.resourceId,
      event: DomainEvent.IMPORT_COMPLETED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: true,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ImportHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.IMPORT_COMPLETED, 'onImportCompleted', Date.now() - start, errorCount);
}

export function registerImportHooks(): void {
  eventBus.on(DomainEvent.IMPORT_COMPLETED, onImportCompleted);
}
