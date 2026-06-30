/**
 * events/hooks/documentHooks.ts — Document Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * DOCUMENT_SIGNED  → Audit + Notification + KPI
 * DOCUMENT_CREATED → Audit + KPI
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { recordKpiValue } from '../../performance/performanceEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[DocumentHooks] ${msg}`);
}

async function onDocumentSigned(payload: DomainEventPayload): Promise<void> {
  log(`DOCUMENT_SIGNED org=${payload.organizationId} user=${payload.userId}`);
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
      kpiCode: 'documents_signed',
      value: 1,
      periodStart,
      periodEnd,
      source: DomainEvent.DOCUMENT_SIGNED,
      metadata: { resourceId: payload.resourceId },
    });
    log('KPI updated');
  } catch (err) { errorCount++; console.error('[DocumentHooks] KPI:', err); }

  // 2. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Document',
      resourceId: payload.resourceId,
      event: DomainEvent.DOCUMENT_SIGNED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[DocumentHooks] Audit (signed):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.DOCUMENT_SIGNED, 'onDocumentSigned', Date.now() - start, errorCount);
}

async function onDocumentCreated(payload: DomainEventPayload): Promise<void> {
  log(`DOCUMENT_CREATED org=${payload.organizationId} user=${payload.userId}`);
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
      kpiCode: 'documents_created',
      value: 1,
      periodStart,
      periodEnd,
      source: DomainEvent.DOCUMENT_CREATED,
      metadata: { resourceId: payload.resourceId },
    });
    log('KPI updated');
  } catch (err) { errorCount++; console.error('[DocumentHooks] KPI (created):', err); }

  // 2. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Document',
      resourceId: payload.resourceId,
      event: DomainEvent.DOCUMENT_CREATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[DocumentHooks] Audit (created):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.DOCUMENT_CREATED, 'onDocumentCreated', Date.now() - start, errorCount);
}

export function registerDocumentHooks(): void {
  eventBus.on(DomainEvent.DOCUMENT_SIGNED, onDocumentSigned);
  eventBus.on(DomainEvent.DOCUMENT_CREATED, onDocumentCreated);
}
