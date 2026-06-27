/**
 * performance/index.ts — Central Export for the Performance Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * Single entry point for the entire Performance Engine.
 * Import everything from here — never from sub-modules directly.
 *
 * ENGINES:
 *   performanceEngine  — Core: record KPI values, orchestrate all engines
 *   leaderboardEngine  — Rankings: compute and read leaderboards
 *   badgeEngine        — Gamification: detect and award badges
 *   challengeEngine    — Competitions: manage challenge lifecycle
 *   goalEngine         — Objectives: track individual/team goals
 *   rankingEngine      — Scores: rank users by any KPI, any scope
 *   statisticsEngine   — Analytics: aggregate stats, trends, comparisons
 *
 * ARCHITECTURE PRINCIPLE:
 * All engines are completely independent of the CRM.
 * KPI values are injected via Domain Events (Ticket 017).
 * No engine imports from Prospect, Client, or Product.
 *
 * USAGE:
 *
 *   // Record a KPI value (called by PerformanceListener):
 *   import { recordKpiValue } from '../performance/index.js';
 *   await recordKpiValue({ userId, kpiCode: 'sales_count', value: 1, ... });
 *
 *   // Get a leaderboard:
 *   import { getLeaderboard } from '../performance/index.js';
 *   const top10 = await getLeaderboard(orgId, 'top_france_monthly');
 *
 *   // Check if user earned badges:
 *   import { evaluateBadges } from '../performance/index.js';
 *   await evaluateBadges(userId, orgId, 'sales_count', newValue);
 */

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE ENGINE (core orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

export {
  recordKpiValue,
  getKpiValue,
  getKpiHistory,
  getKpiSummary,
} from './performanceEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getLeaderboard,
  computeLeaderboard,
  getLeaderboardEntry,
  getLeaderboardHistory,
} from './leaderboardEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// BADGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  evaluateBadges,
  awardBadge,
  getUserBadges,
  getBadgeDefinitions,
} from './badgeEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// CHALLENGE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getActiveChallenges,
  getChallengeLeaderboard,
  updateChallengeScore,
  joinChallenge,
} from './challengeEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// GOAL ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getUserGoals,
  getGoalProgress,
  updateGoalProgress,
  checkGoalCompletion,
} from './goalEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// RANKING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  rankUsers,
  getUserRank,
  getTopN,
  compareUsers,
} from './rankingEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getKpiStatistics,
  getTrend,
  getComparison,
  getSeasonSummary,
} from './statisticsEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (re-exported for consumers)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  KpiValueInput,
  KpiValueRecord,
  KpiSummary,
  LeaderboardResult,
  LeaderboardEntryResult,
  BadgeEvaluationResult,
  ChallengeResult,
  GoalResult,
  GoalProgressResult,
  RankingResult,
  UserRankResult,
  StatisticsResult,
  TrendResult,
  ComparisonResult,
} from './performanceEngine.js';
