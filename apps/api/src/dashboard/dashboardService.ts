/**
 * dashboardService.ts — Dashboard Aggregator Service
 *
 * Ticket 021D — Dashboard Engine & Public Profiles
 *
 * PURPOSE:
 * Orchestrates all dashboard data by aggregating widgets, profiles,
 * leaderboards, and activity feeds into a single response object.
 *
 * THIS SERVICE NEVER:
 * - Calculates KPIs (delegated to Ticket 021A)
 * - Ranks users (delegated to Ticket 021B)
 * - Grants XP (delegated to Ticket 021C)
 * - Modifies any data
 *
 * PERFORMANCE STRATEGY:
 * - All widget builders are called in parallel (Promise.allSettled)
 * - Failed widgets return empty/null gracefully (no cascade failures)
 * - Heavy operations (leaderboard, activity feed) have configurable limits
 */

import { prisma } from '../prisma.js';
import type {
  DashboardDto,
  MobileDashboardDto,
  ManagerDashboardDto,
  ExecutiveDashboardDto,
  RealtimeSnapshotDto,
  GetDashboardParams,
} from './types.js';
import { resolveBranding } from './profileService.js';
import {
  buildTodayScoreWidget,
  buildCurrentStreakWidget,
  buildTodayRankingWidget,
  buildCurrentLevelWidget,
  buildProgressBarWidget,
  buildTopBadgeWidget,
  buildCurrentChallengeWidget,
  buildObjectivesWidget,
  buildNotificationSummaryWidget,
  buildLeaderboardPreviewWidget,
  buildXpCardWidget,
  buildQuickActionsWidget,
  buildAiCoachWidget,
  buildReputationScoreWidget,
} from './widgetService.js';
import { getActivityPreview } from './activityFeedService.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely call a widget builder — returns null if it throws.
 * Prevents a single failed widget from breaking the entire dashboard.
 */
async function safeWidget<T>(builder: Promise<T>): Promise<T | null> {
  try {
    return await builder;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full sales rep dashboard.
 *
 * Aggregates all widget data in parallel and returns a single DashboardDto.
 * Widgets that fail are excluded (graceful degradation).
 */
export async function getDashboard(params: GetDashboardParams): Promise<DashboardDto> {
  const { organizationId, userId, activityLimit = 10 } = params;

  const [
    branding,
    todayScore,
    streak,
    ranking,
    level,
    progress,
    topBadge,
    challenge,
    objectives,
    notifications,
    leaderboard,
    aiCoach,
    recentActivity,
    profile,
  ] = await Promise.all([
    resolveBranding(organizationId),
    safeWidget(buildTodayScoreWidget(organizationId, userId)),
    safeWidget(buildCurrentStreakWidget(organizationId, userId)),
    safeWidget(buildTodayRankingWidget(organizationId, userId)),
    safeWidget(buildCurrentLevelWidget(organizationId, userId)),
    safeWidget(buildProgressBarWidget(organizationId, userId)),
    safeWidget(buildTopBadgeWidget(organizationId, userId)),
    safeWidget(buildCurrentChallengeWidget(organizationId, userId)),
    safeWidget(buildObjectivesWidget(organizationId, userId)),
    safeWidget(buildNotificationSummaryWidget(organizationId, userId)),
    safeWidget(buildLeaderboardPreviewWidget(organizationId, userId)),
    safeWidget(buildAiCoachWidget(organizationId, userId)),
    getActivityPreview(organizationId, userId, activityLimit),
    prisma.userPublicProfile.findUnique({
      where: { userId },
      select: { displayName: true, avatarUrl: true, level: true, currentRank: true },
    }),
  ]);

  const levelInfo = level ?? { level: 1, levelTitle: 'Recrue', levelIcon: null };

  const widgets = [
    todayScore,
    streak,
    ranking,
    level,
    progress,
    topBadge,
    challenge,
    objectives,
    notifications,
    leaderboard,
    aiCoach,
  ].filter((w): w is NonNullable<typeof w> => w !== null);

  return {
    userId,
    organizationId,
    dashboardType: 'SALES_REP',
    generatedAt: new Date(),
    branding,
    widgets,
    recentActivity,
    profile: {
      displayName: profile?.displayName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      currentLevel: profile?.level ?? 1,
      levelTitle: (level as any)?.levelTitle ?? 'Recrue',
      levelIcon: (level as any)?.levelIcon ?? null,
      currentRank: profile?.currentRank ?? null,
    },
  };
}

/**
 * Get the mobile-optimized dashboard.
 * Ordered for mobile layout: XP Card → Ranking → Streak at top.
 */
export async function getMobileDashboard(params: GetDashboardParams): Promise<MobileDashboardDto> {
  const { organizationId, userId, activityLimit = 5 } = params;

  const [
    branding,
    xpCard,
    ranking,
    streak,
    quickActions,
    objectives,
    notifications,
    aiCoach,
    recentActivity,
  ] = await Promise.all([
    resolveBranding(organizationId),
    safeWidget(buildXpCardWidget(organizationId, userId)),
    safeWidget(buildTodayRankingWidget(organizationId, userId)),
    safeWidget(buildCurrentStreakWidget(organizationId, userId)),
    safeWidget(buildQuickActionsWidget(organizationId, userId)),
    safeWidget(buildObjectivesWidget(organizationId, userId)),
    safeWidget(buildNotificationSummaryWidget(organizationId, userId)),
    safeWidget(buildAiCoachWidget(organizationId, userId)),
    getActivityPreview(organizationId, userId, activityLimit),
  ]);

  // Provide safe defaults for required mobile widgets
  const defaultXpCard = xpCard ?? {
    widgetType: 'XP_CARD' as const, label: 'XP', icon: '⭐', color: '#6366F1',
    isVisible: true, position: 0, level: 1, levelTitle: 'Recrue', levelIcon: null,
    levelColor: null, totalXp: 0, progressPercent: 0, remainingXp: 100, nextRewardLabel: null,
  };
  const defaultRanking = ranking ?? {
    widgetType: 'TODAY_RANKING' as const, label: 'Classement', icon: '🏆', color: '#F59E0B',
    isVisible: true, position: 2, rank: null, totalParticipants: null, scope: 'ORGANIZATION', delta: null,
  };
  const defaultStreak = streak ?? {
    widgetType: 'CURRENT_STREAK' as const, label: 'Série', icon: '🔥', color: '#F97316',
    isVisible: true, position: 1, currentStreak: 0, longestStreak: 0, lastActiveDate: null,
  };

  return {
    userId,
    organizationId,
    dashboardType: 'MOBILE',
    generatedAt: new Date(),
    branding,
    topWidgets: [defaultXpCard, defaultRanking, defaultStreak],
    quickActions: quickActions ?? {
      widgetType: 'QUICK_ACTIONS', label: 'Actions', icon: '⚡', color: '#6366F1',
      isVisible: true, position: 11, actions: [],
    },
    recentActivity,
    objectives: objectives ?? {
      widgetType: 'OBJECTIVES', label: 'Objectifs', icon: '🎯', color: '#10B981',
      isVisible: true, position: 7, goals: [], totalGoals: 0, completedGoals: 0,
    },
    notifications: notifications ?? {
      widgetType: 'NOTIFICATIONS_SUMMARY', label: 'Notifications', icon: '🔔', color: '#6366F1',
      isVisible: true, position: 8, unreadCount: 0, recentNotifications: [],
    },
    aiCoach: aiCoach ?? {
      widgetType: 'AI_COACH', label: 'Coach', icon: '🤖', color: '#8B5CF6',
      isVisible: true, position: 12, message: null, hasNewMessage: false,
    },
  };
}

/**
 * Get the manager dashboard.
 * Aggregates team KPIs, team leaderboard, and team activity.
 */
export async function getManagerDashboard(params: GetDashboardParams): Promise<ManagerDashboardDto> {
  const { organizationId, userId, activityLimit = 10 } = params;

  const branding = await resolveBranding(organizationId);

  // Get managed users
  const team = await prisma.user.findMany({
    where: { managerId: userId, organizationId, isActive: true },
    select: { id: true, name: true },
  });

  const teamIds = team.map((u) => u.id);

  // Get primary KPI for the org
  const primaryKpi = await prisma.kpiDefinition.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, code: true, name: true, unit: true },
  });

  // Get team KPI values
  let teamKpis: ManagerDashboardDto['teamKpis'] = [];
  if (primaryKpi && teamIds.length > 0) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const kpiValues = await prisma.userKpiValue.findMany({
      where: {
        userId: { in: teamIds },
        kpiId: primaryKpi.id,
        recordedAt: { gte: startOfMonth },
      },
      orderBy: { value: 'desc' },
      select: { userId: true, value: true },
    });

    teamKpis = kpiValues.map((kv, i) => {
      const member = team.find((u) => u.id === kv.userId);
      return {
        userId: kv.userId,
        userName: member?.name ?? null,
        kpiCode: primaryKpi.code,
        value: Number(kv.value),
        target: null,
        progressPercent: null,
        rank: i + 1,
      };
    });
  }

  // Get team leaderboard (top entries for the active leaderboard)
  const leaderboard = await buildLeaderboardPreviewWidget(organizationId, userId);

  // Team activity (aggregated)
  const teamActivity = await getActivityPreview(organizationId, userId, activityLimit);

  // Team objectives summary
  const teamObjectives = await buildObjectivesWidget(organizationId, userId);

  return {
    userId,
    organizationId,
    dashboardType: 'MANAGER',
    generatedAt: new Date(),
    branding,
    teamKpis,
    teamLeaderboard: leaderboard.entries,
    teamActivity,
    teamObjectives,
  };
}

/**
 * Get the executive dashboard.
 * Aggregates organization-level KPIs and top performers.
 */
export async function getExecutiveDashboard(params: GetDashboardParams): Promise<ExecutiveDashboardDto> {
  const { organizationId, userId, activityLimit = 10 } = params;

  const branding = await resolveBranding(organizationId);

  // Get all active KPIs
  const kpiDefs = await prisma.kpiDefinition.findMany({
    where: { organizationId, isActive: true },
    orderBy: { displayOrder: 'asc' },
    take: 10,
    select: { id: true, code: true, name: true, unit: true },
  });

  // Get org-level KPI aggregates
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const orgKpis: ExecutiveDashboardDto['organizationKpis'] = [];
  for (const kpi of kpiDefs) {
    const values = await prisma.userKpiValue.findMany({
      where: { kpiId: kpi.id, recordedAt: { gte: startOfMonth } },
      select: { userId: true, value: true, user: { select: { name: true } } },
    });

    if (values.length === 0) continue;

    const nums = values.map((v) => Number(v.value));
    const totalValue = nums.reduce((s, n) => s + n, 0);
    const averageValue = totalValue / nums.length;

    const max = values.reduce((best, v) => Number(v.value) > Number(best.value) ? v : best, values[0]!);

    orgKpis.push({
      kpiCode: kpi.code,
      kpiName: kpi.name,
      totalValue,
      averageValue,
      topPerformer: {
        userId: max.userId,
        userName: max.user.name ?? null,
        value: Number(max.value),
      },
    });
  }

  // Top performers (from leaderboard)
  const leaderboard = await buildLeaderboardPreviewWidget(organizationId, userId);

  // Recent org activity
  const recentActivity = await getActivityPreview(organizationId, userId, activityLimit);

  return {
    userId,
    organizationId,
    dashboardType: 'EXECUTIVE',
    generatedAt: new Date(),
    branding,
    organizationKpis: orgKpis,
    topPerformers: leaderboard.entries,
    recentActivity,
  };
}

/**
 * Get a realtime lightweight snapshot.
 * Designed for polling (every 30s) or WebSocket push.
 * Only reads the most critical data points.
 */
export async function getRealtimeSnapshot(
  organizationId: string,
  userId: string,
): Promise<RealtimeSnapshotDto> {
  const [userExp, bestRank, streak, unread, pendingGoals] = await Promise.all([
    prisma.userExperience.findUnique({
      where: { userId },
      select: { totalXp: true, currentLevel: true },
    }),
    prisma.leaderboardEntry.findFirst({
      where: { userId },
      orderBy: { rank: 'asc' },
      select: { rank: true },
    }),
    prisma.xpTransaction.count({
      where: { userId, organizationId, sourceEvent: 'DAILY_LOGIN' },
    }),
    prisma.progressionEvent.count({
      where: { userId, organizationId, notified: false },
    }),
    prisma.goal.count({
      where: { userId, organizationId, status: 'ACTIVE' },
    }),
  ]);

  const levelDef = userExp?.currentLevel
    ? await prisma.levelDefinition.findFirst({
        where: { OR: [{ organizationId }, { isDefault: true }], level: userExp.currentLevel },
        orderBy: { organizationId: 'asc' },
        select: { title: true },
      })
    : null;

  return {
    userId,
    organizationId,
    timestamp: new Date(),
    xp: { total: userExp?.totalXp ?? 0, delta: null },
    level: {
      current: userExp?.currentLevel ?? 1,
      title: levelDef?.title ?? `Niveau ${userExp?.currentLevel ?? 1}`,
    },
    rank: { current: bestRank?.rank ?? null, delta: null },
    streak: { current: streak },
    unreadNotifications: unread,
    pendingGoals,
  };
}

/**
 * Alias for getDashboard() — returns the default role-based dashboard.
 * Routes can call this to get the appropriate dashboard type based on user role.
 */
export async function getSalesDashboard(params: GetDashboardParams): Promise<DashboardDto> {
  return getDashboard(params);
}
