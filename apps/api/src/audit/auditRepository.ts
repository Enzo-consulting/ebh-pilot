/**
 * auditRepository.ts — Audit Data Access Layer
 *
 * Ticket 018 — Audit Engine
 *
 * Low-level Prisma operations for AuditEvent.
 * This layer is intentionally thin — it maps service types to Prisma.
 *
 * SECURITY RULES (enforced at this level):
 * 1. No UPDATE operations on AuditEvent — ever.
 * 2. No DELETE operations on AuditEvent — ever.
 * 3. All reads are scoped to organizationId.
 * 4. Only INSERT is allowed (via insertAuditEvent).
 *
 * These constraints mirror a read-only replica for audit data in production.
 */

import { prisma } from '../prisma.js';
import {
  CreateAuditInput,
  AuditSearchFilters,
  AuditEventRecord,
  AuditSearchResult,
} from './auditTypes.js';

// ─────────────────────────────────────────────────────────────────────────────
// INSERT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a new AuditEvent into the database.
 *
 * This is the ONLY write operation allowed on AuditEvent.
 * Called exclusively by auditService.createAudit().
 *
 * Errors are swallowed intentionally: an audit failure must NEVER
 * cause the parent business operation to fail.
 * The error is logged but not rethrown.
 */
export async function insertAuditEvent(input: CreateAuditInput): Promise<void> {
  try {
    await (prisma as any).auditEvent.create({
      data: {
        eventId:        input.eventId,
        organizationId: input.organizationId,
        businessUnitId: input.businessUnitId ?? null,
        userId:         input.userId ?? null,
        resourceType:   input.resourceType,
        resourceId:     input.resourceId,
        event:          input.event as any,
        occurredAt:     input.occurredAt,
        ipAddress:      input.ipAddress ?? null,
        userAgent:      input.userAgent ?? null,
        device:         input.device ?? null,
        browser:        input.browser ?? null,
        country:        input.country ?? null,
        city:           input.city ?? null,
        metadata:       input.metadata ?? {},
        before:         input.before ?? null,
        after:          input.after ?? null,
        isSystemEvent:  input.isSystemEvent ?? false,
      },
    });
  } catch (error) {
    // Audit write failure must NEVER propagate to the caller.
    // Log and continue — the business operation has already succeeded.
    console.error(
      '[AuditRepository] Failed to insert audit event:',
      error instanceof Error ? error.message : String(error),
      { eventId: input.eventId, event: input.event, resourceId: input.resourceId }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND MANY (with pagination)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Query audit events with filters and pagination.
 *
 * Always scoped to organizationId for multi-tenant isolation.
 * Results are ordered by occurredAt DESC by default (most recent first).
 */
export async function findAuditEvents(
  filters: AuditSearchFilters
): Promise<AuditSearchResult> {
  const page  = Math.max(1, filters.page ?? 1);
  const limit = Math.min(500, Math.max(1, filters.limit ?? 50));
  const skip  = (page - 1) * limit;
  const order = filters.orderBy ?? 'desc';

  // Build Prisma where clause from filters
  const where: Record<string, unknown> = {
    organizationId: filters.organizationId,
  };

  if (filters.businessUnitId) where.businessUnitId = filters.businessUnitId;
  if (filters.userId)         where.userId         = filters.userId;
  if (filters.resourceType)   where.resourceType   = filters.resourceType;
  if (filters.resourceId)     where.resourceId     = filters.resourceId;
  if (filters.event)          where.event          = filters.event;
  if (filters.ipAddress)      where.ipAddress      = filters.ipAddress;
  if (filters.country)        where.country        = filters.country;
  if (filters.isSystemEvent !== undefined) {
    where.isSystemEvent = filters.isSystemEvent;
  }

  // Date range filter
  if (filters.fromDate || filters.toDate) {
    const occurredAt: Record<string, Date> = {};
    if (filters.fromDate) occurredAt.gte = filters.fromDate;
    if (filters.toDate)   occurredAt.lte = filters.toDate;
    where.occurredAt = occurredAt;
  }

  // Execute count and data queries in parallel
  const [total, rawData] = await Promise.all([
    (prisma as any).auditEvent.count({ where }),
    (prisma as any).auditEvent.findMany({
      where,
      orderBy: { occurredAt: order },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data:             rawData as AuditEventRecord[],
    total,
    page,
    limit,
    totalPages,
    hasNextPage:      page < totalPages,
    hasPreviousPage:  page > 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND BY USER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all audit events for a specific user within an organization.
 * Useful for user activity history and HR audit trails.
 */
export async function findAuditEventsByUser(
  organizationId: string,
  userId: string,
  options?: { limit?: number; fromDate?: Date; toDate?: Date }
): Promise<AuditEventRecord[]> {
  const where: Record<string, unknown> = { organizationId, userId };

  if (options?.fromDate || options?.toDate) {
    const occurredAt: Record<string, Date> = {};
    if (options.fromDate) occurredAt.gte = options.fromDate;
    if (options.toDate)   occurredAt.lte = options.toDate;
    where.occurredAt = occurredAt;
  }

  return (prisma as any).auditEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: options?.limit ?? 100,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND BY RESOURCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the complete audit trail for a specific resource.
 * Useful for displaying the history of a prospect, client, product, etc.
 *
 * Example: getAuditHistory('prospect', '123e4567') returns all events
 * that ever touched this prospect.
 */
export async function findAuditEventsByResource(
  organizationId: string,
  resourceType: string,
  resourceId: string,
  options?: { limit?: number }
): Promise<AuditEventRecord[]> {
  return (prisma as any).auditEvent.findMany({
    where: { organizationId, resourceType, resourceId },
    orderBy: { occurredAt: 'desc' },
    take: options?.limit ?? 50,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count audit events matching the given filters.
 * Used for statistics dashboards and compliance reports.
 */
export async function countAuditEvents(
  filters: Pick<
    AuditSearchFilters,
    | 'organizationId'
    | 'businessUnitId'
    | 'userId'
    | 'event'
    | 'resourceType'
    | 'fromDate'
    | 'toDate'
    | 'isSystemEvent'
  >
): Promise<number> {
  const where: Record<string, unknown> = {
    organizationId: filters.organizationId,
  };

  if (filters.businessUnitId) where.businessUnitId = filters.businessUnitId;
  if (filters.userId)         where.userId         = filters.userId;
  if (filters.event)          where.event          = filters.event;
  if (filters.resourceType)   where.resourceType   = filters.resourceType;
  if (filters.isSystemEvent !== undefined) {
    where.isSystemEvent = filters.isSystemEvent;
  }

  if (filters.fromDate || filters.toDate) {
    const occurredAt: Record<string, Date> = {};
    if (filters.fromDate) occurredAt.gte = filters.fromDate;
    if (filters.toDate)   occurredAt.lte = filters.toDate;
    where.occurredAt = occurredAt;
  }

  return (prisma as any).auditEvent.count({ where });
}

// ─────────────────────────────────────────────────────────────────────────────
// FIND BY ORGANIZATION (summary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get recent audit events for an organization.
 * Used for the admin audit dashboard.
 */
export async function findAuditEventsByOrganization(
  organizationId: string,
  options?: { limit?: number; fromDate?: Date }
): Promise<AuditEventRecord[]> {
  const where: Record<string, unknown> = { organizationId };

  if (options?.fromDate) {
    where.occurredAt = { gte: options.fromDate };
  }

  return (prisma as any).auditEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: options?.limit ?? 100,
  });
}
