/**
 * performanceEngine.ts — Core Performance Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * PURPOSE:
 * Central orchestrator for all performance data.
 * Records KPI values and coordinates all other engines.
 *
 * ARCHITECTURE:
 * - Completely independent of CRM (Prospect, Client, Product)
 * - KPI values are injected via Domain Events (Ticket 017)
 * - Calls badgeEngine, challengeEngine, goalEngine after each KPI record
 * - All operations are multi-tenant safe (organizationId always required)
 *
 * CALCULATION MODES (future implementation):
 * - REALTIME  : calculated on every event emission
 * - DEFERRED  : queued and calculated in batch
 * - CRON      : recalculated on schedule (daily, weekly, monthly)
 * - QUEUE     : processed via job queue (Bull, BullMQ)
 * - BATCH     : large-scale recalculation (season reset, import)
 *
 * DOMAIN EVENT INJECTION:
 * A PerformanceListener (future) subscribes to DomainEvents and calls
 * recordKpiValue() to feed the engine without coupling routes to performance.
 *
 * Example mapping:
 *   PROSPECT_CREATED → recordKpiValue({ kpiCode: 'leads_created', value: 1 })
 *   CLIENT_CREATED   → recordKpiValue({ kpiCode: 'clients_won', value: 1 })
 *   IMPORT_COMPLETED → recordKpiValue({ kpiCode: 'imports_done', value: 1 })
 */

import { prisma } from '../prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Input to record a KPI value for a user. */
export interface KpiValueInput {
  userId:         string;
  organizationId: string;
  kpiCode:        string;
  value:          number;
  periodStart:    Date;
  periodEnd:      Date;
  seasonId?:      string | null;
  source?:        string;
  metadata?:      Record<string, unknown>;
}

/** A single KPI value record as returned from the database. */
export interface KpiValueRecord {
  id:            string;
  userId:        string;
  kpiCode:       string;
  value:         number;
  periodStart:   Date;
  periodEnd:     Date;
  calculatedAt:  Date;
  source:        string;
  metadata:      Record<string, unknown>;
}

/** Aggregated KPI summary for a user and period. */
export interface KpiSummary {
  userId:        string;
  kpiCode:       string;
  kpiName:       string;
  unit:          string;
  total:         number;
  average:       number;
  max:           number;
  min:           number;
  count:         number;
  periodStart:   Date;
  periodEnd:     Date;
}

// Leaderboard types
export interface LeaderboardResult {
  id:          string;
  name:        string;
  scope:       string;
  kpiCode:     string;
  aggregation: string;
  entries:     LeaderboardEntryResult[];
  computedAt:  Date;
}

export interface LeaderboardEntryResult {
  position:  number;
  userId:    string;
  userName:  string | null;
  score:     number;
  variation: number | null;
}

// Badge types
export interface BadgeEvaluationResult {
  badgesAwarded: string[];
  xpEarned:      number;
}

// Challenge types
export interface ChallengeResult {
  id:           string;
  name:         string;
  status:       string;
  type:         string;
  kpiCode:      string;
  targetValue:  number | null;
  startDate:    Date;
  endDate:      Date;
  participants: number;
}

// Goal types
export interface GoalResult {
  id:          string;
  kpiCode:     string;
  name:        string;
  targetValue: number;
  period:      string;
  startDate:   Date;
  endDate:     Date;
  status:      string;
}

export interface GoalProgressResult {
  currentValue: number;
  progressPct:  number;
  projection:   number | null;
  recordedAt:   Date;
}

// Ranking types
export interface RankingResult {
  userId:    string;
  userName:  string | null;
  score:     number;
  rank:      number;
}

export interface UserRankResult {
  userId:    string;
  rank:      number;
  score:     number;
  total:     number;
  percentile: number;
}

// Statistics types
export interface StatisticsResult {
  kpiCode:    string;
  total:      number;
  average:    number;
  max:        number;
  min:        number;
  stdDev:     number;
  count:      number;
  period:     { from: Date; to: Date };
}

export interface TrendResult {
  kpiCode:    string;
  points:     Array<{ date: Date; value: number }>;
  trend:      'up' | 'down' | 'stable';
  changeRate: number;
}

export interface ComparisonResult {
  kpiCode:    string;
  entities:   Array<{ id: string; label: string; value: number }>;
  winner:     string;
  gap:        number;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD KPI VALUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a KPI value for a user.
 *
 * This is the main entry point for feeding performance data.
 * Called by PerformanceListener (future) after receiving a DomainEvent.
 *
 * After recording, triggers:
 * 1. Badge evaluation (badgeEngine.evaluateBadges)
 * 2. Goal progress update (goalEngine.updateGoalProgress)
 * 3. Challenge score update (challengeEngine.updateChallengeScore)
 * 4. Leaderboard recalculation (async, deferred)
 *
 * CALCULATION MODES:
 * - REALTIME: immediate (current implementation)
 * - DEFERRED: queued via Bull/BullMQ (future)
 * - BATCH:    accumulated and computed on schedule (future)
 *
 * @param input - KPI value to record
 */
export async function recordKpiValue(input: KpiValueInput): Promise<void> {
  try {
    // 1. Find the KPI definition
    const kpi = await (prisma as any).kpiDefinition.findUnique({
      where: {
        organizationId_code: {
          organizationId: input.organizationId,
          code: input.kpiCode,
        },
      },
      select: { id: true, isActive: true },
    });

    if (!kpi || !kpi.isActive) {
      console.warn(`[PerformanceEngine] KPI "${input.kpiCode}" not found or inactive.`);
      return;
    }

    // 2. Store the KPI value
    await (prisma as any).userKpiValue.create({
      data: {
        userId:         input.userId,
        kpiId:          kpi.id,
        organizationId: input.organizationId,
        value:          input.value,
        periodStart:    input.periodStart,
        periodEnd:      input.periodEnd,
        calculatedAt:   new Date(),
        source:         input.source ?? 'event_bus',
        metadata:       input.metadata ?? {},
        seasonId:       input.seasonId ?? null,
      },
    });

    // 3. Trigger downstream engines (fire-and-forget — do not block)
    // These will be implemented in their respective engine files.
    // They are called here for orchestration visibility.
    // TODO: import and call when engines are implemented:
    // evaluateBadges(input.userId, input.organizationId, input.kpiCode, input.value)
    // updateGoalProgress(input.userId, input.organizationId, input.kpiCode)
    // updateChallengeScore(input.userId, input.organizationId, input.kpiCode, input.value)

  } catch (error) {
    // Never propagate — KPI recording must not break business operations
    console.error(`[PerformanceEngine] recordKpiValue error: ${error}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET KPI VALUE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the latest KPI value for a user.
 *
 * @param organizationId - The organization
 * @param userId         - The user
 * @param kpiCode        - KPI code
 */
export async function getKpiValue(
  organizationId: string,
  userId: string,
  kpiCode: string
): Promise<KpiValueRecord | null> {
  try {
    const kpi = await (prisma as any).kpiDefinition.findUnique({
      where: { organizationId_code: { organizationId, code: kpiCode } },
      select: { id: true },
    });
    if (!kpi) return null;

    const latest = await (prisma as any).userKpiValue.findFirst({
      where: { userId, kpiId: kpi.id, organizationId },
      orderBy: { calculatedAt: 'desc' },
    });

    return latest ? { ...latest, kpiCode, value: Number(latest.value) } : null;
  } catch (error) {
    console.error(`[PerformanceEngine] getKpiValue error: ${error}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET KPI HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get historical KPI values for a user within a date range.
 *
 * Used for:
 * - Sparklines and charts on dashboards
 * - Trend calculation (statisticsEngine)
 * - Goal progress tracking
 * - Mobile widgets
 *
 * @param organizationId - The organization
 * @param userId         - The user
 * @param kpiCode        - KPI code
 * @param from           - Start date
 * @param to             - End date
 * @param limit          - Max number of records (default: 100)
 */
export async function getKpiHistory(
  organizationId: string,
  userId: string,
  kpiCode: string,
  from: Date,
  to: Date,
  limit = 100
): Promise<KpiValueRecord[]> {
  try {
    const kpi = await (prisma as any).kpiDefinition.findUnique({
      where: { organizationId_code: { organizationId, code: kpiCode } },
      select: { id: true },
    });
    if (!kpi) return [];

    const records = await (prisma as any).userKpiValue.findMany({
      where: {
        userId,
        kpiId: kpi.id,
        organizationId,
        periodStart: { gte: from },
        periodEnd:   { lte: to },
      },
      orderBy: { periodStart: 'asc' },
      take: limit,
    });

    return records.map((r: any) => ({ ...r, kpiCode, value: Number(r.value) }));
  } catch (error) {
    console.error(`[PerformanceEngine] getKpiHistory error: ${error}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET KPI SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get an aggregated summary of a KPI for a user over a period.
 *
 * Returns total, average, max, min, count.
 *
 * Used for:
 * - Dashboard KPI cards
 * - Goal tracking
 * - Leaderboard score computation
 * - Mobile summary widgets
 *
 * @param organizationId - The organization
 * @param userId         - The user
 * @param kpiCode        - KPI code
 * @param from           - Start date
 * @param to             - End date
 */
export async function getKpiSummary(
  organizationId: string,
  userId: string,
  kpiCode: string,
  from: Date,
  to: Date
): Promise<KpiSummary | null> {
  try {
    const kpi = await (prisma as any).kpiDefinition.findUnique({
      where: { organizationId_code: { organizationId, code: kpiCode } },
    });
    if (!kpi) return null;

    const records = await (prisma as any).userKpiValue.findMany({
      where: {
        userId,
        kpiId: kpi.id,
        organizationId,
        periodStart: { gte: from },
        periodEnd:   { lte: to },
      },
      select: { value: true },
    });

    if (records.length === 0) return null;

    const values = records.map((r: any) => Number(r.value));
    const total   = values.reduce((a: number, b: number) => a + b, 0);
    const average = total / values.length;
    const max     = Math.max(...values);
    const min     = Math.min(...values);

    return {
      userId,
      kpiCode,
      kpiName:     kpi.name,
      unit:        kpi.unit,
      total,
      average,
      max,
      min,
      count:       values.length,
      periodStart: from,
      periodEnd:   to,
    };
  } catch (error) {
    console.error(`[PerformanceEngine] getKpiSummary error: ${error}`);
    return null;
  }
}
