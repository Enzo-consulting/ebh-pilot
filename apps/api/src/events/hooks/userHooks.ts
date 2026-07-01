/**
 * events/hooks/userHooks.ts — User Domain Hooks
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * USER_CREATED → Audit
 * USER_UPDATED → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';

import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';

function log(msg: string): void {
  if (DEBUG) console.log(`[UserHooks] ${msg}`);
}

async function onUserCreated(payload: DomainEventPayload): Promise<void> {
  log(`USER_CREATED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'User',
      resourceId: payload.resourceId,
      event: DomainEvent.USER_CREATED,
      occurredAt: payload.occurredAt,
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[UserHooks] Audit (created):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.USER_CREATED, Date.now() - start, errorCount > 0);
}

async function onUserUpdated(payload: DomainEventPayload): Promise<void> {
  log(`USER_UPDATED org=${payload.organizationId} user=${payload.userId}`);
  const start = Date.now();
  let errorCount = 0;

  try {
    await createAudit({
      eventId: payload.eventId,
      organizationId: payload.organizationId,
      businessUnitId: payload.businessUnitId,
      userId: payload.userId,
      resourceType: 'User',
      resourceId: payload.resourceId,
      event: DomainEvent.USER_UPDATED,
      occurredAt: payload.occurredAt,
      metadata: payload.metadata ?? {},
      isSystemEvent: false,
    });
    log('Audit created');
  } catch (err) { errorCount++; console.error('[UserHooks] Audit (updated):', err); }

  eventMetrics.recordListenerExecution(DomainEvent.USER_UPDATED, Date.now() - start, errorCount > 0);
}

export function registerUserHooks(): void {
  eventBus.subscribe(DomainEvent.USER_CREATED, onUserCreated);
  eventBus.subscribe(DomainEvent.USER_UPDATED, onUserUpdated);
}
