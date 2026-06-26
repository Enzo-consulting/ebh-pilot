/**
 * eventBus.ts — Core Event Bus
 *
 * Ticket 017 — Core Event Bus & Domain Events
 *
 * This is the central hub for all domain events in EBH-Pilot.
 * It follows the Observer / Pub-Sub pattern.
 *
 * ARCHITECTURE PRINCIPLE:
 * - Routes emit events (fire-and-forget)
 * - Listeners react to events independently
 * - No listener knows about another listener
 * - No listener is coupled to the business logic
 *
 * FUTURE SCALABILITY:
 * Swap InMemoryEventBus for RedisEventBus, RabbitMQEventBus, KafkaEventBus
 * or NATSEventBus by implementing IEventBus — without touching any route.
 *
 * PERFORMANCE:
 * All listeners are called asynchronously via Promise.allSettled().
 * A single slow listener never blocks the HTTP response.
 * Errors in listeners are caught and logged, not propagated.
 */

import { DomainEvent, DomainEventPayload, EventListener } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACE — allows swapping implementations (Redis, RabbitMQ, Kafka, NATS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contract that any Event Bus implementation must satisfy.
 *
 * By programming against this interface instead of a concrete class,
 * the entire business layer stays decoupled from the transport mechanism.
 *
 * Implementations:
 * - InMemoryEventBus (current, for dev and monolith)
 * - RedisEventBus (future, for multi-instance)
 * - RabbitMQEventBus (future, for microservices)
 * - KafkaEventBus (future, for high-throughput)
 * - NATSEventBus (future, for edge / IoT)
 */
export interface IEventBus {
  /**
   * Subscribe a listener to a specific domain event.
   * The listener will be called every time this event is emitted.
   */
  subscribe(event: DomainEvent, listener: EventListener): void;

  /**
   * Unsubscribe a listener from a domain event.
   * Useful for testing and cleanup.
   */
  unsubscribe(event: DomainEvent, listener: EventListener): void;

  /**
   * Emit a domain event.
   * All registered listeners for this event are called asynchronously.
   * Errors in individual listeners are caught and logged — they never
   * propagate back to the caller.
   */
  emit(event: DomainEvent, payload: DomainEventPayload): Promise<void>;

  /**
   * Alias for emit() — for semantic clarity in some contexts.
   * Use publish() when the intent is "I am publishing a fact that happened".
   * Use emit() when the intent is "I am triggering a reaction".
   */
  publish(event: DomainEvent, payload: DomainEventPayload): Promise<void>;

  /**
   * Register a listener (alias for subscribe).
   * Provided for compatibility with registry-style auto-registration.
   */
  register(event: DomainEvent, listener: EventListener): void;

  /**
   * Clear all listeners for a specific event, or all listeners if no event given.
   * Useful for testing (reset between test cases).
   */
  clear(event?: DomainEvent): void;

  /**
   * Get the number of listeners registered for a given event.
   * Useful for debugging and monitoring.
   */
  listenerCount(event: DomainEvent): number;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InMemoryEventBus — synchronous in-process event bus.
 *
 * Suitable for:
 * - Single-process Node.js applications (monolith)
 * - Development and testing
 * - Low-to-medium traffic applications
 *
 * Limitations:
 * - Events are lost on process crash (not durable)
 * - Events are not shared across multiple instances (no fan-out)
 *
 * When to migrate:
 * - Multiple API replicas needed → migrate to Redis Pub/Sub
 * - High-throughput event streams → migrate to Kafka
 * - Complex routing logic → migrate to RabbitMQ
 * - Edge / mobile push → migrate to NATS
 */
export class InMemoryEventBus implements IEventBus {
  private readonly listeners: Map<DomainEvent, Set<EventListener>>;

  constructor() {
    this.listeners = new Map();
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────

  subscribe(event: DomainEvent, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  // ── Unsubscribe ───────────────────────────────────────────────────────────

  unsubscribe(event: DomainEvent, listener: EventListener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
    }
  }

  // ── Emit ──────────────────────────────────────────────────────────────────

  /**
   * Emit an event to all registered listeners.
   *
   * Listeners are called concurrently via Promise.allSettled().
   * This means:
   * - All listeners start at the same time
   * - A slow listener does not block other listeners
   * - An error in one listener does not stop others
   * - The HTTP route receives the response before listeners finish
   */
  async emit(event: DomainEvent, payload: DomainEventPayload): Promise<void> {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) {
      return;
    }

    const promises = Array.from(set).map((listener) =>
      listener(payload).catch((error) => {
        // Listeners MUST NOT throw — but if they do, we catch here
        // and log without propagating. This prevents one broken listener
        // from crashing the entire event chain.
        console.error(
          `[EventBus] Listener error for event "${event}": ${error instanceof Error ? error.message : String(error)}`
        );
      })
    );

    await Promise.allSettled(promises);
  }

  // ── Publish (alias for emit) ───────────────────────────────────────────────

  async publish(event: DomainEvent, payload: DomainEventPayload): Promise<void> {
    return this.emit(event, payload);
  }

  // ── Register (alias for subscribe) ────────────────────────────────────────

  register(event: DomainEvent, listener: EventListener): void {
    this.subscribe(event, listener);
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  clear(event?: DomainEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  // ── ListenerCount ─────────────────────────────────────────────────────────

  listenerCount(event: DomainEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
