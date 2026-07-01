/**
 * activityFeedService.ts — Unified Activity Feed Service
 *
 * Ticket 021D — Dashboard Engine & Public Profiles
 *
 * PURPOSE:
 * Aggregates events from multiple sources into a single chronological timeline.
 * This service is READ-ONLY — it never mutates any data.
 *
 * DATA SOURCES (merged and sorted by occurredAt):
 * 1. ActivityFeedEvent   — high-level gamification events (Ticket 020B)
 *    Examples: "Thomas passe Top 10", "Julie obtient badge Expert"
 * 2. XpTransaction       — XP gains/losses (Ticket 021C)
 *    Examples: "+150 XP — Vente conclue"
 * 3. UserBadge           — badge earnings (Ticket 020)
 *    Examples: "Badge Expert débloqué"
 * 4. UserLevelHistory    — level promotions (Ticket 021C)
 *    Examples: "Passage au niveau Expert"
 * 5. ProgressionEvent    — system notifications (Ticket 020B)
 *    Examples: "Entrée Top 10 France"
 * 6. AuditEvent          — business actions (Ticket 018)
 *    Examples: "Nouveau client créé", "Prospect qualifié"
 *
 * PAGINATION:
 * Uses cursor-based pagination (by activity item ID or timestamp).
 * Never uses OFFSET — safe for millions of records.
 *
 * FILTERING:
 * Caller can restrict to specific event types via the `types` param.
 */

import { prisma } from '../prisma.js';
import type { ActivityDto, ActivityFeedDto, GetActivityFeedParams } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// ICON / COLOR MAPS
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, string> = {
  XP_GAINED:            '⚡',
  XP_REMOVED:           '📉',
  USER_LEVEL_UP:        '🎉',
  BADGE_EARNED:         '🎖️',
  GOAL_REACHED:         '🎯',
  CHALLENGE_COMPLETED:  '⚔️',
  LEADERBOARD_ENTRY:    '🏆',
  NEW_CLIENT:           '🤝',
  PROSPECT_CREATED:     '👤',
  PROSPECT_UPDATED:     '✏️',
  ENTERED_TOP_10:       '🔝',
  ENTERED_TOP_100:      '📊',
  STREAK_MILESTONE:     '🔥',
  DEFAULT:              '📌',
};

const ACTIVITY_COLORS: Record<string, string> = {
  XP_GAINED:            '#6366F1',
  XP_REMOVED:           '#EF4444',
  USER_LEVEL_UP:        '#F59E0B',
  BADGE_EARNED:         '#F59E0B',
  GOAL_REACHED:         '#10B981',
  CHALLENGE_COMPLETED:  '#EF4444',
  LEADERBOARD_ENTRY:    '#F59E0B',
  NEW_CLIENT:           '#10B981',
  PROSPECT_CREATED:     '#60A5FA',
  DEFAULT:              '#6B7280',
};

function getIcon(type: string): string {
  return ACTIVITY_ICONS[type] ?? ACTIVITY_ICONS['DEFAULT']!;
}

function getColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? ACTIVITY_COLORS['DEFAULT']!;
}

// ─────────────────────────────────────────────────────────────────────────────
// SOURCE FETCHERS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchActivityFeedEvents(
  organizationId: string,
  userId: string,
  limit: number,
  beforeDate?: Date,
): Promise<ActivityDto[]> {
  const events = await prisma.activityFeedEvent.findMany({
    where: {
      organizationId,
      actorId: userId,
      isVisible: true,
      ...(beforeDate && { occurredAt: { lt: beforeDate } }),
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      icon: true,
      color: true,
      actorName: true,
      actorAvatarUrl: true,
      occurredAt: true,
      resourceType: true,
      resourceId: true,
      metadata: true,
    },
  });

  return events.map((e) => ({
    id: `feed_${e.id}`,
    type: e.type,
    title: e.title,
    body: e.body,
    icon: e.icon ?? getIcon(e.type),
    color: e.color ?? getColor(e.type),
    actorName: e.actorName,
    actorAvatarUrl: e.actorAvatarUrl,
    occurredAt: e.occurredAt,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    metadata: (e.metadata as Record<string, unknown>) ?? {},
  }));
}

async function fetchXpTransactions(
  organizationId: string,
  userId: string,
  limit: number,
  beforeDate?: Date,
): Promise<ActivityDto[]> {
  const txs = await prisma.xpTransaction.findMany({
    where: {
      organizationId,
      userId,
      ...(beforeDate && { createdAt: { lt: beforeDate } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      xp: true,
      sourceEvent: true,
      reason: true,
      createdAt: true,
      metadata: true,
    },
  });

  return txs.map((tx) => {
    const isGain = tx.xp > 0;
    const type = isGain ? 'XP_GAINED' : 'XP_REMOVED';
    const sign = isGain ? '+' : '';
    return {
      id: `xp_${tx.id}`,
      type,
      title: `${sign}${tx.xp} XP`,
      body: tx.reason ?? tx.sourceEvent.replace(/_/g, ' '),
      icon: getIcon(type),
      color: getColor(type),
      actorName: null,
      actorAvatarUrl: null,
      occurredAt: tx.createdAt,
      resourceType: 'XpTransaction',
      resourceId: tx.id,
      metadata: (tx.metadata as Record<string, unknown>) ?? {},
    };
  });
}

async function fetchBadgeEarnings(
  organizationId: string,
  userId: string,
  limit: number,
  beforeDate?: Date,
): Promise<ActivityDto[]> {
  const badges = await prisma.userBadge.findMany({
    where: {
      userId,
      badge: { organizationId },
      ...(beforeDate && { earnedAt: { lt: beforeDate } }),
    },
    orderBy: { earnedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      earnedAt: true,
      badge: { select: { name: true, icon: true, color: true, rarity: true } },
    },
  });

  return badges.map((ub) => ({
    id: `badge_${ub.id}`,
    type: 'BADGE_EARNED',
    title: `Badge ${ub.badge.name} débloqué`,
    body: `Rareté : ${ub.badge.rarity}`,
    icon: ub.badge.icon ?? '🎖️',
    color: ub.badge.color ?? getColor('BADGE_EARNED'),
    actorName: null,
    actorAvatarUrl: null,
    occurredAt: ub.earnedAt,
    resourceType: 'Badge',
    resourceId: ub.id,
    metadata: { rarity: ub.badge.rarity },
  }));
}

async function fetchLevelPromotions(
  organizationId: string,
  userId: string,
  limit: number,
  beforeDate?: Date,
): Promise<ActivityDto[]> {
  const promotions = await prisma.userLevelHistory.findMany({
    where: {
      organizationId,
      userId,
      ...(beforeDate && { promotedAt: { lt: beforeDate } }),
    },
    orderBy: { promotedAt: 'desc' },
    take: limit,
    select: { id: true, oldLevel: true, newLevel: true, xpAtPromotion: true, promotedAt: true, metadata: true },
  });

  return promotions
    .filter((p) => p.newLevel > p.oldLevel) // only actual promotions
    .map((p) => ({
      id: `level_${p.id}`,
      type: 'USER_LEVEL_UP',
      title: `Passage au niveau ${p.newLevel}`,
      body: `${p.xpAtPromotion} XP total`,
      icon: getIcon('USER_LEVEL_UP'),
      color: getColor('USER_LEVEL_UP'),
      actorName: null,
      actorAvatarUrl: null,
      occurredAt: p.promotedAt,
      resourceType: 'UserLevelHistory',
      resourceId: p.id,
      metadata: (p.metadata as Record<string, unknown>) ?? {},
    }));
}

async function fetchProgressionEvents(
  organizationId: string,
  userId: string,
  limit: number,
  beforeDate?: Date,
): Promise<ActivityDto[]> {
  const events = await prisma.progressionEvent.findMany({
    where: {
      organizationId,
      userId,
      ...(beforeDate && { occurredAt: { lt: beforeDate } }),
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    select: { id: true, type: true, newValue: true, occurredAt: true, metadata: true },
  });

  return events.map((e) => ({
    id: `prog_${e.id}`,
    type: e.type,
    title: e.type.replace(/_/g, ' '),
    body: e.newValue ?? '',
    icon: getIcon(e.type),
    color: getColor(e.type),
    actorName: null,
    actorAvatarUrl: null,
    occurredAt: e.occurredAt,
    resourceType: 'ProgressionEvent',
    resourceId: e.id,
    metadata: (e.metadata as Record<string, unknown>) ?? {},
  }));
}

async function fetchAuditEvents(
  organizationId: string,
  userId: string,
  limit: number,
  beforeDate?: Date,
): Promise<ActivityDto[]> {
  const BUSINESS_EVENTS = ['PROSPECT_CREATED', 'CLIENT_CREATED', 'PROSPECT_UPDATED', 'PRODUCT_CREATED'];

  const events = await prisma.auditEvent.findMany({
    where: {
      organizationId,
      userId,
      event: { in: BUSINESS_EVENTS as any[] },
      ...(beforeDate && { occurredAt: { lt: beforeDate } }),
    },
    orderBy: { occurredAt: 'desc' },
    take: limit,
    select: {
      id: true,
      event: true,
      resourceType: true,
      resourceId: true,
      occurredAt: true,
      metadata: true,
    },
  });

  return events.map((e) => ({
    id: `audit_${e.id}`,
    type: e.event,
    title: e.event.replace(/_/g, ' '),
    body: `${e.resourceType} ${e.resourceId ?? ''}`.trim(),
    icon: getIcon(e.event),
    color: getColor(e.event),
    actorName: null,
    actorAvatarUrl: null,
    occurredAt: e.occurredAt,
    resourceType: e.resourceType ?? null,
    resourceId: e.resourceId ?? null,
    metadata: (e.metadata as Record<string, unknown>) ?? {},
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the unified activity feed for a user.
 *
 * Merges events from all 6 sources, sorts by occurredAt descending,
 * and returns the first `limit` items.
 *
 * Uses cursor-based pagination — pass the last item's occurredAt as `cursor`
 * to fetch the next page.
 *
 * @param params GetActivityFeedParams
 * @returns ActivityFeedDto with sorted items and pagination info
 */
export async function getActivityFeed(
  params: GetActivityFeedParams,
): Promise<ActivityFeedDto> {
  const { organizationId, userId, cursor, limit = 20, types } = params;
  const safeLimit = Math.min(limit, 100);

  // Decode cursor (ISO date string)
  const beforeDate = cursor ? new Date(cursor) : undefined;

  // Fetch from all sources in parallel
  const fetchLimit = safeLimit * 3; // over-fetch to account for merging
  const [feedEvents, xpTxs, badgeEarnings, levelUps, progEvents, auditEvents] =
    await Promise.all([
      fetchActivityFeedEvents(organizationId, userId, fetchLimit, beforeDate),
      fetchXpTransactions(organizationId, userId, fetchLimit, beforeDate),
      fetchBadgeEarnings(organizationId, userId, fetchLimit, beforeDate),
      fetchLevelPromotions(organizationId, userId, fetchLimit, beforeDate),
      fetchProgressionEvents(organizationId, userId, fetchLimit, beforeDate),
      fetchAuditEvents(organizationId, userId, fetchLimit, beforeDate),
    ]);

  // Merge all sources
  let allItems: ActivityDto[] = [
    ...feedEvents,
    ...xpTxs,
    ...badgeEarnings,
    ...levelUps,
    ...progEvents,
    ...auditEvents,
  ];

  // Apply type filter if provided
  if (types && types.length > 0) {
    allItems = allItems.filter((item) => types.includes(item.type));
  }

  // Sort by occurredAt descending
  allItems.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  // Deduplicate (same id from different sources is impossible, but safety check)
  const seen = new Set<string>();
  allItems = allItems.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  // Paginate
  const items = allItems.slice(0, safeLimit);
  const hasMore = allItems.length > safeLimit;
  const nextCursor = hasMore && items.length > 0
    ? items[items.length - 1]!.occurredAt.toISOString()
    : null;

  return { items, total: allItems.length, hasMore, nextCursor };
}

/**
 * Get a short activity preview for dashboard widgets (latest N items).
 * No pagination — use getActivityFeed() for full feed with pagination.
 */
export async function getActivityPreview(
  organizationId: string,
  userId: string,
  limit = 5,
): Promise<ActivityDto[]> {
  const feed = await getActivityFeed({ organizationId, userId, limit });
  return feed.items;
}
