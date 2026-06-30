/**
 * events/emitBusinessEvent.ts — Business Event Helper
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PURPOSE:
 * Simplifies emitting domain events from business routes.
 * Automatically injects: organizationId, businessUnitId, userId, metadata, timestamp.
 * Avoids code duplication across all routes.
 *
 * USAGE IN ROUTES:
 *   import { emitBusinessEvent } from '../events/emitBusinessEvent.js';
 *   await emitBusinessEvent(req, DomainEvent.PROSPECT_CREATED, {
 *     resourceType: 'prospect',
 *     resourceId: prospect.id,
 *     metadata: { name: prospect.name },
 *   });
 *
 * DIFFERENCE vs emitEvent():
 * - emitEvent() requires passing all context manually
 * - emitBusinessEvent() reads context from req automatically
 * - Use emitBusinessEvent() in routes (preferred)
 * - Use emitEvent() when no Request object is available
 *
 * EVENT_DEBUG:
 * Set EVENT_DEBUG=true in environment to enable verbose event logging.
 * Logs: event type, listeners called, duration, errors, success.
 */

import { Request } from 'express';
import { randomUUID } from 'crypto';
import { eventBus } from './index.js';
import { DomainEvent, DomainEventPayload } from './types.js';
import { eventMetrics } from './eventMetrics.js';

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG MODE
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_DEBUG = process.env.EVENT_DEBUG === 'true';

function debugLog(message: string, data?: unknown): void {
  if (!EVENT_DEBUG) return;
  console.log(`[EventBus:DEBUG] ${message}`, data ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS EVENT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface BusinessEventOptions {
  /** Resource type (e.g. 'prospect', 'client', 'product') */
  resourceType: string;
  /** Resource ID (UUID of the affected entity) */
  resourceId: string;
  /** Additional metadata to attach to the event */
  metadata?: Record<string, unknown>;
  /** Override the actor userId (default: from req.user) */
  actorId?: string;
  /** Override the organizationId (default: from req.user or req.body) */
  organizationId?: string;
  /** Override the businessUnitId */
  businessUnitId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMIT BUSINESS EVENT (main helper)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * emitBusinessEvent — Emit a domain event from a business route.
 *
 * Automatically extracts context from the Express Request:
 * - organizationId: from req.user.organizationId or req.body.organizationId
 * - businessUnitId: from req.user.businessUnitId
 * - userId: from req.user.id or req.user.sub
 * - timestamp: current ISO timestamp
 * - eventId: new UUID
 *
 * All hooks registered via hookRegistry.ts will be triggered.
 *
 * @param req     - Express Request (for context extraction)
 * @param event   - The domain event to emit
 * @param options - Resource and metadata options
 */
export async function emitBusinessEvent(
  req: Request,
  event: DomainEvent,
  options: BusinessEventOptions,
): Promise<void> {
  const startTime = Date.now();

  // Extract context from request
  const user = (req as Request & { user?: Record<string, unknown> }).user ?? {};
  const organizationId =
    options.organizationId ??
    (user.organizationId as string) ??
    (req.body?.organizationId as string) ??
    'unknown';
  const businessUnitId =
    options.businessUnitId ??
    (user.businessUnitId as string) ??
    undefined;
  const userId =
    options.actorId ??
    (user.id as string) ??
    (user.sub as string) ??
    (user.userId as string) ??
    'system';

  const payload: DomainEventPayload = {
    eventId: randomUUID(),
    event,
    organizationId,
    businessUnitId,
    userId,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    metadata: {
      ...options.metadata,
      _source: 'emitBusinessEvent',
      _route: req.path,
      _method: req.method,
    },
    timestamp: new Date().toISOString(),
  };

  debugLog(`Emitting ${event}`, {
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    organizationId,
    userId,
  });

  // Record event emission in metrics
  eventMetrics.recordEventEmitted(event);

  try {
    await eventBus.emit(event, payload);
    const duration = Date.now() - startTime;
    debugLog(`${event} processed in ${duration}ms`);
  } catch (err) {
    // The event bus should never throw (it uses Promise.allSettled internally)
    // This catch is a safety net only
    console.error(`[emitBusinessEvent] Unexpected error emitting ${event}:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMIT SYSTEM EVENT (no Request needed)
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemEventOptions {
  organizationId: string;
  userId?: string;
  businessUnitId?: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

/**
 * emitSystemEvent — Emit a domain event from a non-route context.
 *
 * Use this when no Express Request is available:
 * - Scheduled jobs (cron)
 * - Background workers
 * - CLI scripts
 * - Import processors
 *
 * @param event   - The domain event to emit
 * @param options - Full context options (no Request)
 */
export async function emitSystemEvent(
  event: DomainEvent,
  options: SystemEventOptions,
): Promise<void> {
  const payload: DomainEventPayload = {
    eventId: randomUUID(),
    event,
    organizationId: options.organizationId,
    businessUnitId: options.businessUnitId,
    userId: options.userId ?? 'system',
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    metadata: {
      ...options.metadata,
      _source: 'emitSystemEvent',
    },
    timestamp: new Date().toISOString(),
  };

  debugLog(`[System] Emitting ${event}`, options);
  eventMetrics.recordEventEmitted(event);

  try {
    await eventBus.emit(event, payload);
  } catch (err) {
    console.error(`[emitSystemEvent] Unexpected error emitting ${event}:`, err);
  }
}
