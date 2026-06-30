/**
 * events/hooks/userHooks.ts — User Domain Hooks
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * USER_CREATED → Audit (initialize user record)
 * USER_UPDATED → Audit
 */

import { eventBus } from '../index.js';
import { DomainEvent, DomainEventPayload } from '../types.js';
import { eventMetrics } from '../eventMetrics.js';
import { createAudit } from '../../audit/auditService.js';

const DEBUG = process.env.EVENT_DEBUG === 'true';
const log = (msg: string) => DEBUG && console.log(`[UserHooks] ${msg}`);

async function onUserCreated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;

  // Audit
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'USER_CREATED', resourceType: 'User', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
    log('Audit recorded');
  } catch (err) { errors++; console.error('[UserHooks] Audit error:', err); }

  eventMetrics.recordListenerExecution(DomainEvent.USER_CREATED, Date.now() - start, errors > 0);
  log(`USER_CREATED processed in ${Date.now() - start}ms`);
}

async function onUserUpdated(payload: DomainEventPayload): Promise<void> {
  const start = Date.now();
  let errors = 0;
  try {
    await createAudit({ organizationId: payload.organizationId, userId: payload.userId, action: 'USER_UPDATED', resourceType: 'User', resourceId: payload.resourceId, metadata: payload.metadata ?? {} });
  } catch (err) { errors++; console.error('[UserHooks] Audit error:', err); }
  eventMetrics.recordListenerExecution(DomainEvent.USER_UPDATED, Date.now() - start, errors > 0);
}

export function registerUserHooks(): void {
  eventBus.subscribe(DomainEvent.USER_CREATED, onUserCreated);
  eventBus.subscribe(DomainEvent.USER_UPDATED, onUserUpdated);
  if (DEBUG) console.log('[UserHooks] Registered 2 hooks');
}
