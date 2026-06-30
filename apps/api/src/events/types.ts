/**
 * types.ts — Domain Events & Payload Types
 *
 * Ticket 017 — Core Event Bus & Domain Events
 *
 * Defines all domain events and the generic payload interface.
 * No business logic here — only types and enums.
 *
 * Future: connect to Redis Pub/Sub, RabbitMQ, Kafka, NATS
 * by swapping the EventBus implementation without touching these types.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN EVENTS ENUM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exhaustive list of all events that can be emitted in EBH-Pilot.
 *
 * Convention: RESOURCE_ACTION
 * - RESOURCE: the domain entity (USER, PROSPECT, CLIENT, ...)
 * - ACTION: what happened (CREATED, UPDATED, DELETED, ...)
 *
 * Add new events here as new modules are developed.
 * Never remove events — mark as deprecated instead.
 */
export enum DomainEvent {
  // ── Users ─────────────────────────────────────────────────────────────────
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',

  // ── Prospects ─────────────────────────────────────────────────────────────
  PROSPECT_CREATED = 'PROSPECT_CREATED',
  PROSPECT_UPDATED = 'PROSPECT_UPDATED',
  PROSPECT_DELETED = 'PROSPECT_DELETED',

  // ── Clients ───────────────────────────────────────────────────────────────
  CLIENT_CREATED = 'CLIENT_CREATED',
  CLIENT_UPDATED = 'CLIENT_UPDATED',

  // ── Products ──────────────────────────────────────────────────────────────
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',

  // ── Imports ───────────────────────────────────────────────────────────────
  IMPORT_STARTED = 'IMPORT_STARTED',
  IMPORT_COMPLETED = 'IMPORT_COMPLETED',
  IMPORT_FAILED = 'IMPORT_FAILED',

  // ── Documents ─────────────────────────────────────────────────────────────
  /** Document generated (PDF, Excel, ...) */
  DOCUMENT_GENERATED = 'DOCUMENT_GENERATED',
  /** Document signed via e-signature (YouSign, DocuSign, ...) */
  DOCUMENT_SIGNED = 'DOCUMENT_SIGNED',

  // ── Tasks / Todo ──────────────────────────────────────────────────────────
  TASK_CREATED = 'TASK_CREATED',
  TASK_COMPLETED = 'TASK_COMPLETED',

  // ── AI ────────────────────────────────────────────────────────────────────
  /** An AI request has been initiated (translation, analysis, ...) */
  AI_REQUESTED = 'AI_REQUESTED',
  /** An AI request has completed */
  AI_COMPLETED = 'AI_COMPLETED',

  // ── Workflow ──────────────────────────────────────────────────────────────
  /** A workflow has started (approval, escalation, ...) */
  WORKFLOW_STARTED = 'WORKFLOW_STARTED',
  /** A workflow has finished */
  WORKFLOW_FINISHED = 'WORKFLOW_FINISHED',

  // ── Notifications ─────────────────────────────────────────────────────────
  NOTIFICATION_CREATED = 'NOTIFICATION_CREATED',

  // ── Auth ──────────────────────────────────────────────────────────────────
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',

  // ── Module Engine (Ticket 016) ────────────────────────────────────────────
  MODULE_ENABLED = 'MODULE_ENABLED',
  FEATURE_ENABLED = 'FEATURE_ENABLED',

  // ── Gamification (Ticket 022) ─────────────────────────────────────────────
  /** A badge has been awarded to a user */
  BADGE_EARNED = 'BADGE_EARNED',
  /** A goal has been reached */
  GOAL_REACHED = 'GOAL_REACHED',
  /** A challenge has been completed */
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  /** A challenge has been started */
  CHALLENGE_STARTED = 'CHALLENGE_STARTED',
  /** User has leveled up */
  USER_LEVEL_UP = 'USER_LEVEL_UP',
  /** KPI threshold reached */
  KPI_THRESHOLD_REACHED = 'KPI_THRESHOLD_REACHED',
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN EVENT PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generic payload for all domain events.
 *
 * Every event MUST carry this envelope so that:
 * - Audit logs can be written without extra queries
 * - Notifications can route to the right organization
 * - Mobile sync can filter by businessUnit
 * - AI can associate context
 * - Workflow engine can correlate events
 *
 * The `metadata` field is intentionally open (Record<string, unknown>)
 * so each event can carry additional data without modifying this interface.
 */
export interface DomainEventPayload {
  /** Unique identifier for this event instance (UUID v4 recommended) */
  eventId: string;

  /** The domain event type */
  event: DomainEvent;

  /** The organization this event belongs to (multi-tenant isolation) */
  organizationId: string;

  /**
   * Optional business unit (Ticket 014B).
   * Null when the event concerns the whole organization.
   */
  businessUnitId?: string | null;

  /** The user who triggered this event */
  userId: string;

  /**
   * The type of resource affected.
   * Examples: 'prospect', 'client', 'product', 'user', 'import'
   */
  resourceType: string;

  /**
   * The ID of the resource affected.
   * Allows listeners to query the resource if needed.
   */
  resourceId: string;

  /** When the event occurred (ISO 8601) */
  occurredAt: Date;

  /**
   * Free metadata — each event can carry domain-specific data.
   * Examples:
   *   - PROSPECT_CREATED: { prospectName, source }
   *   - IMPORT_FAILED: { errorCode, rowCount, filename }
   *   - AI_REQUESTED: { model, prompt, feature }
   *   - LOGIN_FAILED: { ip, userAgent, reason }
   */
  metadata: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTENER TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A listener is an async function that receives a domain event payload.
 * It must NEVER throw — errors should be caught internally and logged.
 *
 * Listeners are fire-and-forget: the emitter does not wait for them.
 * This ensures that business routes stay fast even when listeners are slow.
 */
export type EventListener = (payload: DomainEventPayload) => Promise<void>;
