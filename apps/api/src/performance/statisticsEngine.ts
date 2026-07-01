/**
 * statisticsEngine.ts — Statistics Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * Advanced analytics: aggregates, trends, comparisons, season summaries.
 *
 * USE CASES:
 * - "How am I trending this month vs last month?"
 * - "What is the average sales_count for my region?"
 * - "Compare my region vs the national average"
 * - "Season 2025 summary for the whole organization"
 * - BI export (Ticket 016 REPORTING module)
 * - AI analysis input (Ticket 016 AI module)
 *
 * CALCULATION METHODS:
 *   REALTIME  — computed on request (current)
 *   DEFERRED  — pre-computed and cached (future with Redis)
 *   CRON      — materialized views refreshed daily/weekly (future)
 *
 * PREMIUM FEATURES:
 * - Historical performance evolution (full history chart)
 * - Advanced statistics (std deviation, percentile distribution)
 * - Export PDF / Excel
 * - IA-generated performance insights
 * - Cross-region comparison (multi-entity)
 * - Custom period comparison (any start/end)
 */

import { prisma } from '../prisma.js';
import type {
  StatisticsResult,
  TrendResult,
  ComparisonResult,
} from './performanceEngine.js';

/**
 * Compute aggregate statistics for a KPI over a period.
 *
 * Returns: total, average, max, min, stdDev, count.
 *
 * @param organizationId - Multi-tenant scope
 * @param kpiCode        - The KPI
 * @param periodStart    - Period start
 * @param periodEnd      - Period end
 * @param userIds        - Optional: filter to specific users
 */
export async function getKpiStatistics(
  organizationId: string,
  kpiCode: string,
  periodStart: Date,
  periodEnd: Date,
  userIds?: string[]
): Promise<StatisticsResult | null> {
  try {
    const kpi = await (prisma as any).kpiDefinition.findUnique({
      where: { organizationId_code: { organizationId, code: kpiCode } },
      select: { id: true },
    });
    if (!kpi) return null;

    const where: Record<string, unknown> = {
      kpiId:          kpi.id,
      organizationId,
      periodStart:    { gte: periodStart },
      periodEnd:      { lte: periodEnd },
    };
    if (userIds?.length) where.userId = { in: userIds };

    const records = await (prisma as any).userKpiValue.findMany({
      where,
      select: { value: true },
    });

    if (records.length === 0) return null;

    const values = records.map((r: any) => Number(r.value));
    const total  = values.reduce((a: number, b: number) => a + b, 0);
    const avg    = total / values.length;
    const max    = Math.max(...values);
    const min    = Math.min(...values);
    const variance = values.reduce((sum: number, v: number) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      kpiCode,
      total,
      average: avg,
      max,
      min,
      stdDev,
      count:   values.length,
      period:  { from: periodStart, to: periodEnd },
    };
  } catch (error) {
    console.error(`[StatisticsEngine] getKpiStatistics error: ${error}`);
    return null;
  }
}

/**
 * Compute the trend of a KPI for a user over multiple periods.
 *
 * Returns data points for charting and a trend direction (up/down/stable).
 *
 * @param organizationId - Multi-tenant scope
 * @param userId         - The user
 * @param kpiCode        - The KPI
 * @param periods        - Array of {start, end} periods to compare
 */
export async function getTrend(
  organizationId: string,
  userId: string,
  kpiCode: string,
  periods: Array<{ start: Date; end: Date }>
): Promise<TrendResult> {
  // TODO: implement trend computation
  // Steps:
  // 1. For each period: compute KPI summary (sum or avg based on calculationType)
  // 2. Create data points: [{ date: period.start, value: aggregated }]
  // 3. Compute changeRate = (lastValue - firstValue) / firstValue * 100
  // 4. Determine trend: up if changeRate > 5%, down if < -5%, else stable
  console.log(`[StatisticsEngine] getTrend() user=${userId}, kpi=${kpiCode}`);
  return {
    kpiCode,
    points:     [],
    trend:      'stable',
    changeRate: 0,
  };
}

/**
 * Compare multiple entities (users, sites, regions) on a KPI.
 *
 * Used for:
 * - Side-by-side user comparison (Premium)
 * - Agency vs agency comparison (Premium)
 * - Region vs region (Premium)
 * - National vs regional average
 *
 * @param organizationId - Multi-tenant scope
 * @param kpiCode        - The KPI
 * @param entities       - Array of { id, type, label } to compare
 * @param periodStart    - Period start
 * @param periodEnd      - Period end
 */
export async function getComparison(
  organizationId: string,
  kpiCode: string,
  entities: Array<{ id: string; type: 'user' | 'site' | 'sector' | 'region' | 'bu'; label: string }>,
  periodStart: Date,
  periodEnd: Date
): Promise<ComparisonResult> {
  // TODO: implement multi-entity comparison
  // Premium feature — requires ADVANCED_ANALYTICS feature flag (Ticket 016)
  console.log(`[StatisticsEngine] getComparison() kpi=${kpiCode}, entities=${entities.length}`);
  return {
    kpiCode,
    entities: [],
    winner:   '',
    gap:      0,
  };
}

/**
 * Get a full summary of a season for an organization.
 *
 * Used for:
 * - Season-end report (who won, top performers, records broken)
 * - Year-in-review dashboard
 * - BI export (Ticket 016 REPORTING module)
 * - AI-generated season narrative (Ticket 016 AI module)
 *
 * @param organizationId - Multi-tenant scope
 * @param seasonId       - The season
 */
export async function getSeasonSummary(
  organizationId: string,
  seasonId: string
): Promise<{
  seasonId:        string;
  seasonName:      string;
  topPerformers:   Array<{ userId: string; kpiCode: string; value: number }>;
  totalKpiValues:  number;
  totalBadgesAwarded: number;
  challengesCompleted: number;
  goalsReached:    number;
} | null> {
  try {
    const season = await (prisma as any).season.findFirst({
      where: { id: seasonId, organizationId },
      select: { id: true, name: true },
    });
    if (!season) return null;

    const [totalKpiValues, totalBadgesAwarded, challengesCompleted, goalsReached] =
      await Promise.all([
        (prisma as any).userKpiValue.count({ where: { seasonId, organizationId } }),
        // TODO: count badges earned during season period
        Promise.resolve(0),
        (prisma as any).challenge.count({ where: { seasonId, organizationId, status: 'COMPLETED' } }),
        (prisma as any).goal.count({ where: { seasonId, organizationId, status: 'COMPLETED' } }),
      ]);

    return {
      seasonId:            season.id,
      seasonName:          season.name,
      topPerformers:       [], // TODO: compute top 3 per KPI
      totalKpiValues,
      totalBadgesAwarded,
      challengesCompleted,
      goalsReached,
    };
  } catch (error) {
    console.error(`[StatisticsEngine] getSeasonSummary error: ${error}`);
    return null;
  }
}
