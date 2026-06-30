/**
 * events/hooks/productHooks.ts — Product Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PRODUCT_CREATED → KPI + Audit + Notification
 * PRODUCT_UPDATED → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { recordKpiValue } from '../../performance/performanceEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[ProductHooks] ${msg}`);
}

async function onProductCreated(payload: DomainEventPayload): Promise<void> {
  log(`PRODUCT_CREATED org=${payload.organizationId} user=${payload.userId}`);
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
      kpiCode: 'products_created',
      value: 1,
      periodStart,
      periodEnd,
      source: DomainEvent.PRODUCT_CREATED,
      metadata: { resourceId: payload.resourceId },
    });
    log('KPI updated');
  } catch (err) { errorCount++; console.error('[ProductHooks] KPI:', err); }

  // 2. Audit
  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Product',
      resourceId: payload.resourceId,
      event: DomainEvent.PRODUCT_CREATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ProductHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.PRODUCT_CREATED, 'onProductCreated', Date.now() - start, errorCount);
}

async function onProductUpdated(payload: DomainEventPayload): Promise<void> {
  log(`PRODUCT_UPDATED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'Product',
      resourceId: payload.resourceId,
      event: DomainEvent.PRODUCT_UPDATED,
      occurredAt: new Date(payload.timestamp),
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[ProductHooks] Audit (update):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.PRODUCT_UPDATED, 'onProductUpdated', Date.now() - start, errorCount);
}

export function registerProductHooks(): void {
  eventBus.on(DomainEvent.PRODUCT_CREATED, onProductCreated);
  eventBus.on(DomainEvent.PRODUCT_UPDATED, onProductUpdated);
}
