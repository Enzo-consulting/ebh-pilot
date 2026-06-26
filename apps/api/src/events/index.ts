/**
 * events/index.ts — Central Export & Singleton EventBus
 *
 * Ticket 017 — Core Event Bus & Domain Events
 *
 * PURPOSE:
 * This is the single entry point for the entire Event Bus system.
 * All other files import from here, never from sub-modules directly.
 *
 * EXPORTS:
 * - eventBus      → the singleton InMemoryEventBus instance
 * - All types     → DomainEvent, DomainEventPayload, EventListener
 * - IEventBus     → the interface for future implementations
 * - emitEvent()   → convenience helper for routes to emit events
 * - createPayload() → convenience helper to build a valid DomainEventPayload
 *
 * USAGE IN ROUTES (future, after connecting events to routes):
 *
 *   import { emitEvent, DomainEvent } from '../events/index.js';
 *
 *   // After creating a prospect:
 *   await emitEvent(req, DomainEvent.PROSPECT_CREATED, {
 *     resourceType: 'prospect',
 *     resourceId: prospect.id,
 *     metadata: { prospectName: prospect.name, source: 'manual' },
 *   });
 *
 * SINGLETON PATTERN:
 * eventBus is a module-level singleton.
 * Node.js module caching ensures only one instance exists per process.
 * If multiple instances are needed (e.g., namespaced buses), instantiate
 * InMemoryEventBus directly from './eventBus.js'.
 */

import { randomUUID } from 'crypto';
import { Request } from 'express';
import { InMemoryEventBus } from './eventBus.js';
import { DomainEvent, DomainEventPayload } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON EVENT BUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The application-wide singleton EventBus instance.
 *
 * Import this in:
 * - listenerRegistry.ts (to subscribe listeners)
 * - routes (to emit events — future, not yet connected)
 * - index.ts (to bootstrap listeners on startup)
 *
 * Never instantiate InMemoryEventBus directly in routes.
 * Always use this singleton to ensure all listeners are registered.
 */
export const eventBus = new InMemoryEventBus();

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS (convenience — import everything from events/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

export { DomainEvent } from './types.js';
export type { DomainEventPayload, EventListener } from './types.js';
export type { IEventBus } from './eventBus.js';
export { InMemoryEventBus } from './eventBus.js';
export { registerListener, bootstrapListeners } from './listenerRegistry.js';

// ─────────────────────────────────────────────────────────────────────────────
// PAYLOAD BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a valid DomainEventPayload from minimal inputs.
 *
 * Automatically fills:
 * - eventId (UUID v4)
 * - occurredAt (current timestamp)
 *
 * Usage:
 *   const payload = createPayload(req, DomainEvent.PROSPECT_CREATED, {
 *     resourceType: 'prospect',
 *     resourceId: prospect.id,
 *     metadata: { prospectName: 'Acme Corp' },
 *   });
 *
 * The req object must have been processed by injectAuthUser() (Ticket 015)
 * so that req.user, req.organizationId, req.businessUnitId are available.
 */
export function createPayload(
  req: Request & {
    user?: { id: string };
    organizationId?: string;
    businessUnitId?: string | null;
  },
  event: DomainEvent,
  options: {
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }
): DomainEventPayload {
  return {
    eventId: randomUUID(),
    event,
    organizationId: req.organizationId ?? 'unknown',
    businessUnitId: req.businessUnitId ?? null,
    userId: req.user?.id ?? 'unknown',
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    occurredAt: new Date(),
    metadata: options.metadata ?? {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMIT HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convenience helper for routes to emit a domain event.
 *
 * Fire-and-forget by design:
 * - The route does NOT await the listeners
 * - The HTTP response is sent immediately
 * - Listeners run asynchronously in the background
 *
 * This ensures that even if a listener is slow (e.g., sending email),
 * the user gets a fast API response.
 *
 * Error handling:
 * - Individual listener errors are caught inside InMemoryEventBus.emit()
 * - The route never sees listener errors
 *
 * Usage in a route:
 *
 *   // AFTER sending the HTTP response:
 *   emitEvent(req, DomainEvent.PROSPECT_CREATED, {
 *     resourceType: 'prospect',
 *     resourceId: prospect.id,
 *     metadata: { prospectName: prospect.name },
 *   });
 *
 * Note: Do NOT await emitEvent() in routes — it is fire-and-forget.
 */
export function emitEvent(
  req: Request & {
    user?: { id: string };
    organizationId?: string;
    businessUnitId?: string | null;
  },
  event: DomainEvent,
  options: {
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const payload = createPayload(req, event, options);
  // Fire-and-forget: intentionally not awaited
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  eventBus.emit(event, payload).catch((error) => {
    console.error('[EventBus] Unhandled emit error:', error);
  });
}
