/**
 * events/hooks/importHooks.ts — Import Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * IMPORT_COMPLETED → KPI + Leaderboard + Audit
 * IMPORT_FAILED    → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { recordKpiValue } from '../../performance/performanceEngine.js';
import { computeLeaderboard } from '../../performance/leaderboardEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[ImportHooks] ${msg}`);

async function onImportCompleted(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // KPI
  try {
    const importedCount = (payload.metadata?.recordCount as number) ?? 1;
    await recordKpiValue({ organizationId: payload.organizationId, userId: payload.userId, kpiCode: 'imports_completed', value: importedCount, period: 'daily', sourceEvent: DomainEvent.IMPORT_COMPLETED, sourceResourceId: payload.resourceId });
    log(`KPI updated: ${importedCount} records`);
  } catch (err) { errors++; console.error('[ImportHooks] KPI error:', err); }

  // Leaderboard
  try {
    await computeLeaderboard(payload.organizationId, 'imports_completed', 'monthly');
    log('Leaderboard updated');
  } catch (err) { errors++; console.error('[ImportHooks] Leaderboard error:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'IMPORT_COMPLETED', resourceType: 'Import', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[ImportHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.IMPORT_COMPLETED, Date.now() - start, errors > 0);
  log(`IMPORT_COMPLETED processed in ${Date.now() - start}ms`);
}

async function onImportFailed(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'IMPORT_FAILED', resourceType: 'Import', resourceId: payload.resourceId, metadata: { ...payload.metadata, severity: 'error' } });
  } catch (err) { errors++; console.error('[ImportHooks] Audit error:', err); }
  eventMetrics.recordListenerExecution(DomainEvent.IMPORT_FAILED, Date.now() - start, errors > 0);
}

export function registerImportHooks(): void {
  eventBus.subscribe(DomainEvent.IMPORT_COMPLETED, onImportCompleted);
  eventBus.subscribe(DomainEvent.IMPORT_FAILED, onImportFailed);
  if (DEBUG) console.log('[ImportHooks] Registered 2 hooks');
  }
