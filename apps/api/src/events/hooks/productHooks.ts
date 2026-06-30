/**
 * events/hooks/productHooks.ts — Product Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PRODUCT_CREATED → KPI + Audit
 * PRODUCT_UPDATED → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { recordKpiValue } from '../../performance/performanceEngine.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[ProductHooks] ${msg}`);

async function onProductCreated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // KPI
  try {
    await recordKpiValue({ userId: payload.userId, organizationId: payload.organizationId, kpiCode: 'products_created', value: 1, periodStart, periodEnd, source: DomainEvent.PRODUCT_CREATED, metadata: { resourceId: payload.resourceId } });
    log('KPI updated');
  } catch (err) { errors++; console.error('[ProductHooks] KPI:', err); }

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'PRODUCT_CREATED', resourceType: 'Product', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[ProductHooks] Audit:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.PRODUCT_CREATED, Date.now() - start, errors > 0);
  log(`PRODUCT_CREATED done in ${Date.now() - start}ms`);
}

async function onProductUpdated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'PRODUCT_UPDATED', resourceType: 'Product', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[ProductHooks] Audit (update):', err); }
  eventMetrics.recordListenerExecution(DomainEvent.PRODUCT_UPDATED, Date.now() - start, errors > 0);
}

export function registerProductHooks(): void {
  eventBus.subscribe(DomainEvent.PRODUCT_CREATED, onProductCreated);
  eventBus.subscribe(DomainEvent.PRODUCT_UPDATED, onProductUpdated);
  if (DEBUG) console.log('[ProductHooks] Registered 2 hooks');
}
