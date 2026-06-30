/**
 * events/hooks/documentHooks.ts — Document Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * DOCUMENT_SIGNED   → KPI + Audit
 * DOCUMENT_GENERATED → KPI + Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { recordKpiValue } from '../../performance/performanceEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[DocumentHooks] ${msg}`);

async function onDocumentSigned(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  try {
    await recordKpiValue({ userId: payload.userId, organizationId: payload.organizationId, kpiCode: 'documents_signed', value: 1, periodStart, periodEnd, source: DomainEvent.DOCUMENT_SIGNED, metadata: { resourceId: payload.resourceId } });
    log('KPI updated');
  } catch (err) { errors++; console.error('[DocumentHooks] KPI:', err); }

  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'DOCUMENT_SIGNED', resourceType: 'Document', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[DocumentHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.DOCUMENT_SIGNED, Date.now() - start, errors > 0);
}

async function onDocumentGenerated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  try {
    await recordKpiValue({ userId: payload.userId, organizationId: payload.organizationId, kpiCode: 'documents_generated', value: 1, periodStart, periodEnd, source: DomainEvent.DOCUMENT_GENERATED, metadata: { resourceId: payload.resourceId } });
  } catch (err) { errors++; console.error('[DocumentHooks] KPI:', err); }

  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'DOCUMENT_GENERATED', resourceType: 'Document', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[DocumentHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.DOCUMENT_GENERATED, Date.now() - start, errors > 0);
}

export function registerDocumentHooks(): void {
  eventBus.subscribe(DomainEvent.DOCUMENT_SIGNED, onDocumentSigned);
  eventBus.subscribe(DomainEvent.DOCUMENT_GENERATED, onDocumentGenerated);
  if (DEBUG) console.log('[DocumentHooks] Registered 2 hooks');
}
