/**
 * auditTypes.ts — Audit Engine Types & Interfaces
 *
 * Ticket 018 — Audit Engine
 *
 * Defines all TypeScript interfaces for the Audit Engine.
 * No business logic here — only types.
 *
 * All types are designed to be compatible with:
 * - Prisma AuditEvent model (schema.prisma)
 * - DomainEventPayload from Event Bus (Ticket 017)
 * - Multi-tenant architecture (Ticket 014)
 * - Business Unit hierarchy (Ticket 014B)
 */

// ─────────────────────────────────────────────────────────────────────────────
// CORE AUDIT INPUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input required to create an AuditEvent.
 *
 * This is what the AuditListener passes to auditService.createAudit().
 * Most fields come directly from DomainEventPayload (Ticket 017).
 * Security context fields (ip, userAgent, etc.) are extracted from the
 * HTTP request by middleware before the event is emitted.
 */
export interface CreateAuditInput {
  /** Unique ID of the domain event (from DomainEventPayload.eventId) */
  eventId: string;

  /** Organization for multi-tenant isolation */
  organizationId: string;

  /** Business Unit if applicable (Ticket 014B) */
  businessUnitId?: string | null;

  /** User who triggered the action. Null for system events. */
  userId?: string | null;

  /** Type of resource affected (e.g. "prospect", "client", "product") */
  resourceType: string;

  /** ID of the resource affected */
  resourceId: string;

  /** Domain event type (mirrors DomainEvent enum from Ticket 017) */
  event: string;

  /** When the event occurred (from DomainEventPayload.occurredAt) */
  occurredAt: Date;

  // ── Security context ──────────────────────────────────────────────────────

  /** Client IP address (IPv4 or IPv6). Null for system events. */
  ipAddress?: string | null;

  /** Full User-Agent string */
  userAgent?: string | null;

  /** Device type: "desktop" | "mobile" | "tablet" | "api" | "system" */
  device?: string | null;

  /** Browser name: "Chrome" | "Firefox" | "Safari" | "Edge" | "mobile-app" */
  browser?: string | null;

  /** Country code (ISO 3166-1 alpha-2, e.g. "FR") */
  country?: string | null;

  /** City detected from IP geolocation */
  city?: string | null;

  // ── Event data ────────────────────────────────────────────────────────────

  /** Free metadata from the event emitter */
  metadata?: Record<string, unknown>;

  /** Snapshot of the resource BEFORE the change (for UPDATE/DELETE) */
  before?: Record<string, unknown> | null;

  /** Snapshot of the resource AFTER the change (for CREATE/UPDATE) */
  after?: Record<string, unknown> | null;

  /** true if triggered by the system (cron, import, AI), false if by a user */
  isSystemEvent?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH FILTERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filters for audit log search queries.
 *
 * All filters are optional — combine them for precise queries.
 * All queries are automatically scoped to the user's organizationId
 * via the multi-tenant middleware (Ticket 014).
 */
export interface AuditSearchFilters {
  /** Filter by organization (required in service layer for isolation) */
  organizationId: string;

  /** Filter by specific Business Unit (Ticket 014B) */
  businessUnitId?: string;

  /** Filter by region ID */
  regionId?: string;

  /** Filter by sector ID */
  sectorId?: string;

  /** Filter by site ID */
  siteId?: string;

  /** Filter by user who triggered the action */
  userId?: string;

  /** Filter by resource type (e.g. "prospect", "client", "product") */
  resourceType?: string;

  /** Filter by specific resource ID */
  resourceId?: string;

  /** Filter by event type (e.g. "PROSPECT_CREATED") */
  event?: string;

  /** Filter events that occurred after this date */
  fromDate?: Date;

  /** Filter events that occurred before this date */
  toDate?: Date;

  /** Filter by IP address (for security investigations) */
  ipAddress?: string;

  /** Filter by country code */
  country?: string;

  /** Filter system events only */
  isSystemEvent?: boolean;

  // ── Pagination ────────────────────────────────────────────────────────────

  /** Page number (1-based). Default: 1 */
  page?: number;

  /** Number of results per page. Default: 50, Max: 500 */
  limit?: number;

  /** Sort order. Default: "desc" (most recent first) */
  orderBy?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT EVENT (OUTPUT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single audit event as returned by the database.
 * Mirrors the Prisma AuditEvent model.
 */
export interface AuditEventRecord {
  id: string;
  eventId: string;
  organizationId: string;
  businessUnitId: string | null;
  userId: string | null;
  resourceType: string;
  resourceId: string;
  event: string;
  occurredAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  metadata: Record<string, unknown>;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  isSystemEvent: boolean;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATED RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paginated audit search result.
 */
export interface AuditSearchResult {
  /** Array of audit events for the current page */
  data: AuditEventRecord[];

  /** Total number of matching events across all pages */
  total: number;

  /** Current page number (1-based) */
  page: number;

  /** Number of events per page */
  limit: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there is a next page */
  hasNextPage: boolean;

  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for audit log export.
 *
 * Exports are signed for tamper detection and compliance.
 * Supported formats: CSV, Excel (XLSX), PDF.
 */
export interface AuditExportOptions {
  /** Organization to export (for multi-tenant isolation) */
  organizationId: string;

  /** Export format */
  format: 'csv' | 'xlsx' | 'pdf';

  /** Optional filters to apply before export */
  filters?: Omit<AuditSearchFilters, 'organizationId' | 'page' | 'limit'>;

  /**
   * Whether to include the "before" and "after" diff columns.
   * These can be large — disable for summary exports.
   * Default: false
   */
  includeDiff?: boolean;

  /**
   * Whether to include security context (IP, userAgent, device, country).
   * May be restricted for RGPD compliance depending on configuration.
   * Default: true
   */
  includeSecurityContext?: boolean;

  /**
   * Whether to digitally sign the export for tamper detection.
   * Required for ISO 27001 / SOC 2 compliance exports.
   * Default: true
   */
  signExport?: boolean;

  /**
   * Optional label for the export file.
   * If not provided, a timestamped name is generated.
   */
  label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT RESULT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of an audit export operation.
 */
export interface AuditExportResult {
  /** Path or URL to the generated file */
  fileUrl: string;

  /** File format */
  format: 'csv' | 'xlsx' | 'pdf';

  /** Total number of records exported */
  recordCount: number;

  /** When the export was generated */
  generatedAt: Date;

  /** Digital signature hash (SHA-256) for tamper detection */
  signature: string | null;

  /** Who requested the export */
  requestedBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT STATISTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate statistics for an audit log query.
 * Used for dashboards and compliance reports.
 */
export interface AuditStatistics {
  /** Total number of events in the filtered period */
  totalEvents: number;

  /** Number of unique users who triggered events */
  uniqueUsers: number;

  /** Number of unique resources affected */
  uniqueResources: number;

  /** Number of failed login attempts */
  loginFailures: number;

  /** Number of system events (isSystemEvent = true) */
  systemEvents: number;

  /** Event counts broken down by event type */
  byEventType: Record<string, number>;

  /** Event counts broken down by resource type */
  byResourceType: Record<string, number>;

  /** Event counts broken down by country */
  byCountry: Record<string, number>;

  /** Period covered by these statistics */
  period: { from: Date; to: Date };
}
