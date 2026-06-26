/**
 * listenerRegistry.ts — Listener Auto-Registration System
 *
 * Ticket 017 — Core Event Bus & Domain Events
 *
 * PURPOSE:
 * Centralizes the registration of all listeners onto the event bus.
 * This is the ONLY place where listeners are wired to events.
 *
 * HOW IT WORKS:
 * 1. Each listener module exports a function: (payload) => Promise<void>
 * 2. registerListener() attaches it to a specific DomainEvent
 * 3. bootstrapListeners() is called once at application startup
 * 4. After that, routes simply call eventBus.emit() — no awareness of listeners needed
 *
 * ADDING A NEW LISTENER:
 * 1. Create your listener function in listeners/
 * 2. Import it here
 * 3. Add registerListener(DomainEvent.YOUR_EVENT, yourListener) below
 * That's it. No other file needs to change.
 *
 * PHILOSOPHY:
 * The registry is the ONLY place with coupling knowledge.
 * Business routes know nothing about listeners.
 * Listeners know nothing about each other.
 * Only the registry knows who listens to what.
 */

import { DomainEvent, EventListener } from './types.js';
import { eventBus } from './index.js';

import {
  NotificationListener,
  AuditListener,
  WorkflowListener,
  StatisticsListener,
  AIListener,
  MobileSyncListener,
  DocumentListener,
} from './listeners/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register a listener for a specific domain event.
 *
 * This is a thin wrapper around eventBus.subscribe() that provides:
 * - Clear, readable registration declarations
 * - A single place to add/remove listener-event bindings
 * - Easy to scan for "which events trigger which listeners"
 *
 * @param event     - The DomainEvent to listen for
 * @param listener  - The EventListener function to call
 */
export function registerListener(event: DomainEvent, listener: EventListener): void {
  eventBus.subscribe(event, listener);
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTENER REGISTRATION MAP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bootstrap all listeners by registering them on the event bus.
 *
 * Call this function ONCE at application startup (in apps/api/src/index.ts).
 * After this, all routes can call eventBus.emit() freely.
 *
 * CURRENT REGISTRATIONS (all are skeletons — ready for implementation):
 *
 * Notifications:
 *   PROSPECT_CREATED → NotificationListener  (e.g. "New prospect assigned")
 *   CLIENT_CREATED   → NotificationListener  (e.g. "New client created")
 *   TASK_CREATED     → NotificationListener  (e.g. "You have a new task")
 *   LOGIN_FAILED     → NotificationListener  (e.g. "Suspicious login attempt")
 *
 * Audit:
 *   (all events) → AuditListener  (writes an audit trail for every action)
 *
 * Workflow:
 *   PROSPECT_CREATED → WorkflowListener  (e.g. trigger onboarding workflow)
 *   CLIENT_CREATED   → WorkflowListener  (e.g. trigger welcome workflow)
 *   IMPORT_COMPLETED → WorkflowListener  (e.g. trigger post-import validation)
 *
 * Statistics / Reporting:
 *   PROSPECT_CREATED → StatisticsListener  (increment counters)
 *   CLIENT_CREATED   → StatisticsListener  (increment counters)
 *   IMPORT_COMPLETED → StatisticsListener  (record import metrics)
 *
 * AI:
 *   AI_REQUESTED → AIListener  (route to AI provider, log usage)
 *   AI_COMPLETED → AIListener  (store result, update tokens used)
 *
 * Mobile Sync:
 *   PROSPECT_CREATED → MobileSyncListener  (push to mobile clients)
 *   PROSPECT_UPDATED → MobileSyncListener
 *   CLIENT_CREATED   → MobileSyncListener
 *   TASK_CREATED     → MobileSyncListener  (push task to mobile)
 *   TASK_COMPLETED   → MobileSyncListener
 *
 * Documents:
 *   DOCUMENT_GENERATED → DocumentListener  (archive, notify, share)
 *   DOCUMENT_SIGNED    → DocumentListener  (record signature, update status)
 */
export function bootstrapListeners(): void {
  // ── Notifications ──────────────────────────────────────────────────────────
  // Future: send in-app, email, push, SMS, WhatsApp notifications
  registerListener(DomainEvent.PROSPECT_CREATED, NotificationListener);
  registerListener(DomainEvent.CLIENT_CREATED, NotificationListener);
  registerListener(DomainEvent.TASK_CREATED, NotificationListener);
  registerListener(DomainEvent.LOGIN_FAILED, NotificationListener);
  registerListener(DomainEvent.NOTIFICATION_CREATED, NotificationListener);

  // ── Audit ──────────────────────────────────────────────────────────────────
  // Future: write immutable audit log entries for compliance & traceability
  registerListener(DomainEvent.USER_CREATED, AuditListener);
  registerListener(DomainEvent.USER_UPDATED, AuditListener);
  registerListener(DomainEvent.USER_DELETED, AuditListener);
  registerListener(DomainEvent.PROSPECT_CREATED, AuditListener);
  registerListener(DomainEvent.PROSPECT_UPDATED, AuditListener);
  registerListener(DomainEvent.PROSPECT_DELETED, AuditListener);
  registerListener(DomainEvent.CLIENT_CREATED, AuditListener);
  registerListener(DomainEvent.CLIENT_UPDATED, AuditListener);
  registerListener(DomainEvent.PRODUCT_CREATED, AuditListener);
  registerListener(DomainEvent.PRODUCT_UPDATED, AuditListener);
  registerListener(DomainEvent.IMPORT_STARTED, AuditListener);
  registerListener(DomainEvent.IMPORT_COMPLETED, AuditListener);
  registerListener(DomainEvent.IMPORT_FAILED, AuditListener);
  registerListener(DomainEvent.DOCUMENT_GENERATED, AuditListener);
  registerListener(DomainEvent.DOCUMENT_SIGNED, AuditListener);
  registerListener(DomainEvent.LOGIN_SUCCESS, AuditListener);
  registerListener(DomainEvent.LOGIN_FAILED, AuditListener);
  registerListener(DomainEvent.MODULE_ENABLED, AuditListener);
  registerListener(DomainEvent.FEATURE_ENABLED, AuditListener);

  // ── Workflow ───────────────────────────────────────────────────────────────
  // Future: trigger automated sequences (approval flows, onboarding, alerts)
  registerListener(DomainEvent.PROSPECT_CREATED, WorkflowListener);
  registerListener(DomainEvent.CLIENT_CREATED, WorkflowListener);
  registerListener(DomainEvent.IMPORT_COMPLETED, WorkflowListener);
  registerListener(DomainEvent.WORKFLOW_STARTED, WorkflowListener);
  registerListener(DomainEvent.WORKFLOW_FINISHED, WorkflowListener);

  // ── Statistics / Reporting ─────────────────────────────────────────────────
  // Future: update real-time counters, dashboards, BI, cohorts
  registerListener(DomainEvent.PROSPECT_CREATED, StatisticsListener);
  registerListener(DomainEvent.CLIENT_CREATED, StatisticsListener);
  registerListener(DomainEvent.IMPORT_COMPLETED, StatisticsListener);
  registerListener(DomainEvent.IMPORT_FAILED, StatisticsListener);
  registerListener(DomainEvent.TASK_COMPLETED, StatisticsListener);
  registerListener(DomainEvent.AI_COMPLETED, StatisticsListener);

  // ── AI ─────────────────────────────────────────────────────────────────────
  // Future: route AI requests, log usage, store results, quota management
  registerListener(DomainEvent.AI_REQUESTED, AIListener);
  registerListener(DomainEvent.AI_COMPLETED, AIListener);

  // ── Mobile Sync ────────────────────────────────────────────────────────────
  // Future: push data changes to React Native / Flutter mobile clients
  // Covers: Challenges, Todo, Agenda, Push, GPS, QR, Barcode (Ticket 016 prep)
  registerListener(DomainEvent.PROSPECT_CREATED, MobileSyncListener);
  registerListener(DomainEvent.PROSPECT_UPDATED, MobileSyncListener);
  registerListener(DomainEvent.CLIENT_CREATED, MobileSyncListener);
  registerListener(DomainEvent.TASK_CREATED, MobileSyncListener);
  registerListener(DomainEvent.TASK_COMPLETED, MobileSyncListener);
  registerListener(DomainEvent.NOTIFICATION_CREATED, MobileSyncListener);

  // ── Documents ──────────────────────────────────────────────────────────────
  // Future: archive generated documents, track signatures, notify signatories
  registerListener(DomainEvent.DOCUMENT_GENERATED, DocumentListener);
  registerListener(DomainEvent.DOCUMENT_SIGNED, DocumentListener);
}
