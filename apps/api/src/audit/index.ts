/**
 * audit/index.ts — Central Export for the Audit Engine
 *
 * Ticket 018 — Audit Engine
 *
 * Single entry point for the entire Audit Engine.
 * Import everything from here — never from sub-modules directly.
 *
 * USAGE:
 *
 *   // In AuditListener (events/listeners/index.ts):
 *   import { createAudit } from '../audit/index.js';
 *
 *   // In admin routes (future):
 *   import { searchAudit, exportAudit } from '../audit/index.js';
 *
 *   // In resource detail routes (future):
 *   import { getAuditByResource } from '../audit/index.js';
 *
 * WHAT THIS MODULE PROVIDES:
 *
 * Services (business logic):
 *   createAudit()           — Insert an immutable audit event (called by AuditListener)
 *   searchAudit()           — Query audit events with filters + pagination
 *   getAuditByUser()        — Get audit trail for a specific user
 *   getAuditByResource()    — Get audit trail for a specific resource
 *   getAuditByOrganization() — Get recent events for an organization
 *   getAuditStatistics()    — Aggregate statistics for dashboards
 *   exportAudit()           — Export audit log (CSV, Excel, PDF) with signature
 *
 * Types (TypeScript interfaces):
 *   CreateAuditInput        — Input for createAudit()
 *   AuditSearchFilters      — Filters for searchAudit()
 *   AuditEventRecord        — A single audit event (output)
 *   AuditSearchResult       — Paginated search result
 *   AuditExportOptions      — Options for exportAudit()
 *   AuditExportResult       — Result of exportAudit()
 *   AuditStatistics         — Aggregate statistics
 */

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES (public API of the Audit Engine)
// ─────────────────────────────────────────────────────────────────────────────

export {
  createAudit,
  searchAudit,
  getAuditByUser,
  getAuditByResource,
  getAuditByOrganization,
  getAuditStatistics,
  exportAudit,
} from './auditService.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (re-exported for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  CreateAuditInput,
  AuditSearchFilters,
  AuditEventRecord,
  AuditSearchResult,
  AuditExportOptions,
  AuditExportResult,
  AuditStatistics,
} from './auditTypes.js';
