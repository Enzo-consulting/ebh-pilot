/**
 * leaderboardEngine.ts — Leaderboard Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * Manages all ranking computations and leaderboard reads.
 *
 * SCOPES supported:
 *   PERSONAL, TEAM, SITE, SECTOR, REGION, BUSINESS_UNIT, ORGANIZATION, NATIONAL, INTERNATIONAL
 *
 * CALCULATION MODES:
 *   - REALTIME:  computed on every KPI record (small orgs)
 *   - DEFERRED:  queued and computed async (medium orgs)
 *   - CRON:      recalculated on schedule (large orgs)
 *   - BATCH:     full recalculation for season reset (very large orgs)
 *
 * PRIVACY:
 *   - All leaderboards are scoped to organizationId
 *   - Business Unit isolation respected via scopeEntityId
 *   - isPublic = false → visible only to managers and above
 *   - Anonymous mode possible (show rank without name)
 *
 * MULTI-TENANT SAFETY:
 *   - computeLeaderboard() only reads data for the leaderboard's organizationId
 *   - Cross-tenant data is never mixed
 *
 * PREMIUM FEATURES (future):
 *   - Historical position evolution chart
 *   - Side-by-side user comparison
 *   - Side-by-side agency comparison
 *   - Regional comparison
 *   - Unlimited custom leaderboards
 *   - Filtered leaderboards (by product, brand, territory)
 *   - Private leagues
 */

import prisma from '../prisma.js';
import type {
  LeaderboardResult,
  LeaderboardEntryResult,
} from './performanceEngine.js';

/**
 * Get a leaderboard with its current computed entries.
 *
 * Returns pre-computed entries from LeaderboardEntry table.
 * Call computeLeaderboard() to refresh the entries first if needed.
 *
 * @param organizationId - Multi-tenant scope
 * @param leaderboardId  - The leaderboard ID
 */
export async function getLeaderboard(
  organizationId: string,
  leaderboardId: string
): Promise<LeaderboardResult | null> {
  try {
    const lb = await (prisma as any).leaderboard.findFirst({
      where: { id: leaderboardId, organizationId },
      include: {
        kpi: { select: { code: true, name: true } },
        entries: {
          orderBy: { position: 'asc' },
          take: 100,
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!lb) return null;

    return {
      id:          lb.id,
      name:        lb.name,
      scope:       lb.scope,
      kpiCode:     lb.kpi.code,
      aggregation: lb.aggregation,
      computedAt:  lb.entries[0]?.calculatedAt ?? new Date(),
      entries:     lb.entries.map((e: any) => ({
        position:  e.position,
        userId:    e.userId,
        userName:  e.user?.name ?? null,
        score:     Number(e.score),
        variation: e.variation ?? null,
      })) as LeaderboardEntryResult[],
    };
  } catch (error) {
    console.error(`[LeaderboardEngine] getLeaderboard error: ${error}`);
    return null;
  }
}

/**
 * Compute (or recompute) a leaderboard by aggregating KPI values.
 *
 * Reads UserKpiValue records, groups by user, sorts by score,
 * assigns positions, records variation vs previous computation,
 * and stores results in LeaderboardEntry.
 *
 * Called by:
 * - Cron job (scheduled recalculation)
 * - Event handler after recordKpiValue() (realtime mode)
 * - Admin panel (manual refresh)
 *
 * @param organizationId - Multi-tenant scope
 * @param leaderboardId  - The leaderboard to recompute
 * @param periodStart    - Period start for KPI aggregation
 * @param periodEnd      - Period end for KPI aggregation
 */
export async function computeLeaderboard(
  organizationId: string,
  leaderboardId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // TODO: implement leaderboard computation
  // Steps:
  // 1. Load leaderboard definition (scope, kpiId, aggregation, scopeEntityId)
  // 2. Determine eligible users based on scope:
  //    - SITE      → users where siteId = scopeEntityId
  //    - SECTOR    → users where sectorId = scopeEntityId
  //    - REGION    → users where regionId = scopeEntityId
  //    - BU        → users where businessUnitId = scopeEntityId
  //    - ORG       → all users in organizationId
  // 3. For each user: aggregate UserKpiValue (SUM / AVERAGE / MAX based on kpi.calculationType)
  // 4. Sort by score DESC, assign positions 1..N
  // 5. Load previous LeaderboardEntry to compute variation
  // 6. Store new LeaderboardEntry records
  console.log(`[LeaderboardEngine] computeLeaderboard() called for ${leaderboardId}`);
}

/**
 * Get a user's entry in a specific leaderboard.
 *
 * Used for:
 * - "Your rank" card on user dashboard
 * - Mobile widget (position + score)
 *
 * @param organizationId - Multi-tenant scope
 * @param leaderboardId  - The leaderboard
 * @param userId         - The user
 */
export async function getLeaderboardEntry(
  organizationId: string,
  leaderboardId: string,
  userId: string
): Promise<LeaderboardEntryResult | null> {
  try {
    const lb = await (prisma as any).leaderboard.findFirst({
      where: { id: leaderboardId, organizationId },
      select: { id: true },
    });
    if (!lb) return null;

    const entry = await (prisma as any).leaderboardEntry.findFirst({
      where:   { leaderboardId, userId },
      orderBy: { calculatedAt: 'desc' },
      include: { user: { select: { name: true } } },
    });

    if (!entry) return null;

    return {
      position:  entry.position,
      userId:    entry.userId,
      userName:  entry.user?.name ?? null,
      score:     Number(entry.score),
      variation: entry.variation ?? null,
    };
  } catch (error) {
    console.error(`[LeaderboardEngine] getLeaderboardEntry error: ${error}`);
    return null;
  }
}

/**
 * Get the history of a user's position in a leaderboard.
 *
 * Used for:
 * - Position evolution chart (Premium feature)
 * - "How have I progressed over time?" widget
 *
 * @param organizationId - Multi-tenant scope
 * @param leaderboardId  - The leaderboard
 * @param userId         - The user
 * @param limit          - Number of historical snapshots (default: 12)
 */
export async function getLeaderboardHistory(
  organizationId: string,
  leaderboardId: string,
  userId: string,
  limit = 12
): Promise<Array<{ position: number; score: number; calculatedAt: Date }>> {
  try {
    const lb = await (prisma as any).leaderboard.findFirst({
      where: { id: leaderboardId, organizationId },
      select: { id: true },
    });
    if (!lb) return [];

    const history = await (prisma as any).leaderboardEntry.findMany({
      where:   { leaderboardId, userId },
      orderBy: { calculatedAt: 'desc' },
      take:    limit,
      select:  { position: true, score: true, calculatedAt: true },
    });

    return history.map((h: any) => ({
      position:    h.position,
      score:       Number(h.score),
      calculatedAt: h.calculatedAt,
    }));
  } catch (error) {
    console.error(`[LeaderboardEngine] getLeaderboardHistory error: ${error}`);
    return [];
  }
}
