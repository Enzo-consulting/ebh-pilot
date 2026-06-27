/**
 * widgetService.ts — Widget Aggregator Service
 *
 * Ticket 021D — Dashboard Engine & Public Profiles
 *
 * PURPOSE:
 * Builds individual widget DTOs by reading from existing engines.
 * This service performs NO calculations — it only reads and formats data.
 *
 * WIDGET SOURCES:
 * - TODAY_SCORE       → UserKpiValue (Ticket 021A)
 * - CURRENT_STREAK    → UserKpiValue streak pattern (Ticket 021A)
 * - TODAY_RANKING     → LeaderboardEntry (Ticket 021B)
 * - CURRENT_LEVEL     → UserExperience (Ticket 021C)
 * - PROGRESS_BAR      → UserExperience + LevelDefinition (Ticket 021C)
 * - TOP_BADGE         → UserBadge + Badge (Ticket 020)
 * - CURRENT_CHALLENGE → ChallengeParticipant (Ticket 020)
 * - OBJECTIVES        → Goal + GoalProgress (Ticket 020)
 * - NOTIFICATIONS     → NotificationTemplate count (future)
 * - LEADERBOARD       → LeaderboardEntry (Ticket 021B)
 * - XP_CARD           → UserExperience + LevelDefinition (Ticket 021C)
 * - QUICK_ACTIONS     → WidgetConfig config JSON
 * - AI_COACH          → DailyCoachMessage (Ticket 020B)
 * - REPUTATION_SCORE  → UserReputationIndex (Ticket 020B)
 *
 * WIDGET CONFIG (Ticket 019):
 * Labels, colors, and icons are resolved from WidgetConfig records.
 * Falls back to hardcoded defaults if no org configuration exists.
 */

import { prisma } from '../prisma.js';
import type {
  TodayScoreWidget,
  CurrentStreakWidget,
  TodayRankingWidget,
  CurrentLevelWidget,
  ProgressBarWidget,
  TopBadgeWidget,
  CurrentChallengeWidget,
  ObjectivesWidget,
  NotificationSummaryWidget,
  LeaderboardPreviewWidget,
  XpCardWidget,
  QuickActionsWidget,
  AiCoachWidget,
  ReputationScoreWidget,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve widget config for a given type, falling back to defaults */
async function resolveWidgetConfig(
  organizationId: string,
  widgetType: string,
  defaults: { label: string; icon: string | null; color: string },
): Promise<{ label: string; icon: string | null; color: string; isEnabled: boolean; config: Record<string, unknown> }> {
  const config = await prisma.widgetConfig.findUnique({
    where: { organizationId_widgetType: { organizationId, widgetType: widgetType as any } },
    select: { label: true, icon: true, color: true, isEnabled: true, config: true, displayOrder: true },
  });

  return {
    label: config?.label ?? defaults.label,
    icon: config?.icon ?? defaults.icon,
    color: config?.color ?? defaults.color,
    isEnabled: config?.isEnabled ?? true,
    config: (config?.config as Record<string, unknown>) ?? {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// INDIVIDUAL WIDGET BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the TODAY_SCORE widget.
 * Reads the most recent KPI value for the primary KPI of the organization.
 * The "primary KPI" is the first active KPI ordered by displayOrder.
 */
export async function buildTodayScoreWidget(
  organizationId: string,
  userId: string,
): Promise<TodayScoreWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'TODAY_SCORE', {
    label: "Score du jour",
    icon: '📊',
    color: '#6366F1',
  });

  // Find primary KPI (lowest displayOrder, isActive)
  const primaryKpi = await prisma.kpiDefinition.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: { id: true, code: true, unit: true },
  });

  let score: number | null = null;
  let unit: string | null = null;
  let delta: number | null = null;

  if (primaryKpi) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const todayValue = await prisma.userKpiValue.findFirst({
      where: {
        userId,
        kpiId: primaryKpi.id,
        recordedAt: { gte: startOfDay },
      },
      orderBy: { recordedAt: 'desc' },
      select: { value: true },
    });

    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayValue = await prisma.userKpiValue.findFirst({
      where: {
        userId,
        kpiId: primaryKpi.id,
        recordedAt: { gte: yesterday, lt: startOfDay },
      },
      orderBy: { recordedAt: 'desc' },
      select: { value: true },
    });

    score = todayValue ? Number(todayValue.value) : null;
    unit = primaryKpi.unit;
    if (score !== null && yesterdayValue) {
      delta = score - Number(yesterdayValue.value);
    }
  }

  return {
    widgetType: 'TODAY_SCORE',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 0,
    score,
    unit,
    delta,
    deltaPercent: delta !== null && score !== null && score !== 0
      ? Math.round((delta / score) * 100)
      : null,
    isPositive: delta !== null ? delta >= 0 : true,
  };
}

/**
 * Build the CURRENT_STREAK widget.
 * Reads consecutive active days from XpTransaction (DAILY_LOGIN source events).
 */
export async function buildCurrentStreakWidget(
  organizationId: string,
  userId: string,
): Promise<CurrentStreakWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'CURRENT_STREAK', {
    label: "Série en cours",
    icon: '🔥',
    color: '#F97316',
  });

  // Count consecutive days with at least one XpTransaction
  const recentTx = await prisma.xpTransaction.findMany({
    where: { userId, organizationId, sourceEvent: 'DAILY_LOGIN' },
    orderBy: { createdAt: 'desc' },
    take: 366,
    select: { createdAt: true },
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let lastActiveDate: Date | null = null;

  if (recentTx.length > 0) {
    lastActiveDate = recentTx[0]!.createdAt;
    const days = new Set(recentTx.map((tx) =>
      tx.createdAt.toISOString().split('T')[0]!
    ));

    const today = new Date();
    let current = 0;
    for (let i = 0; i < 366; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0]!;
      if (days.has(key)) {
        current++;
        if (current > longestStreak) longestStreak = current;
        if (i === 0 || current > 1) currentStreak = current;
      } else {
        if (i === 0) break;
        current = 0;
      }
    }
    currentStreak = current;
  }

  return {
    widgetType: 'CURRENT_STREAK',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 1,
    currentStreak,
    longestStreak,
    lastActiveDate,
  };
}

/**
 * Build the TODAY_RANKING widget.
 * Reads the user's best rank across all active leaderboards.
 */
export async function buildTodayRankingWidget(
  organizationId: string,
  userId: string,
): Promise<TodayRankingWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'TODAY_RANKING', {
    label: "Mon classement",
    icon: '🏆',
    color: '#F59E0B',
  });

  const bestEntry = await prisma.leaderboardEntry.findFirst({
    where: { userId },
    orderBy: { rank: 'asc' },
    select: {
      rank: true,
      leaderboard: { select: { name: true, scope: true, entries: { select: { id: true } } } },
    },
  });

  return {
    widgetType: 'TODAY_RANKING',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 2,
    rank: bestEntry?.rank ?? null,
    totalParticipants: bestEntry?.leaderboard?.entries?.length ?? null,
    scope: bestEntry?.leaderboard?.scope ?? 'ORGANIZATION',
    delta: null, // Future: track rank changes
  };
}

/**
 * Build the CURRENT_LEVEL widget.
 */
export async function buildCurrentLevelWidget(
  organizationId: string,
  userId: string,
): Promise<CurrentLevelWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'CURRENT_LEVEL', {
    label: "Niveau actuel",
    icon: '⭐',
    color: '#6366F1',
  });

  const userExp = await prisma.userExperience.findUnique({
    where: { userId },
    select: { currentLevel: true, totalXp: true, lifetimeXp: true },
  });

  const level = userExp?.currentLevel ?? 1;
  const levelDef = await prisma.levelDefinition.findFirst({
    where: { OR: [{ organizationId }, { isDefault: true }], level },
    orderBy: { organizationId: 'asc' },
    select: { title: true, icon: true, color: true },
  });

  return {
    widgetType: 'CURRENT_LEVEL',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 3,
    level,
    levelTitle: levelDef?.title ?? `Niveau ${level}`,
    levelIcon: levelDef?.icon ?? null,
    levelColor: levelDef?.color ?? null,
    totalXp: userExp?.totalXp ?? 0,
    lifetimeXp: userExp?.lifetimeXp ?? 0,
  };
}

/**
 * Build the PROGRESS_BAR widget.
 */
export async function buildProgressBarWidget(
  organizationId: string,
  userId: string,
): Promise<ProgressBarWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'PROGRESS_BAR', {
    label: "Progression",
    icon: null,
    color: '#6366F1',
  });

  const userExp = await prisma.userExperience.findUnique({
    where: { userId },
    select: { currentLevel: true, currentLevelXp: true, nextLevelXp: true, totalXp: true },
  });

  const nextLevel = (userExp?.currentLevel ?? 1) + 1;
  const nextLevelDef = await prisma.levelDefinition.findFirst({
    where: { OR: [{ organizationId }, { isDefault: true }], level: nextLevel },
    orderBy: { organizationId: 'asc' },
    select: { title: true },
  });

  const currentLevelXp = userExp?.currentLevelXp ?? 0;
  const nextLevelXp = userExp?.nextLevelXp ?? 100;
  const progressPercent = nextLevelXp > 0
    ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100))
    : 100;

  return {
    widgetType: 'PROGRESS_BAR',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 4,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
    remainingXp: Math.max(0, nextLevelXp - currentLevelXp),
    nextLevelTitle: nextLevelDef?.title ?? null,
  };
}

/**
 * Build the TOP_BADGE widget.
 */
export async function buildTopBadgeWidget(
  organizationId: string,
  userId: string,
): Promise<TopBadgeWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'TOP_BADGE', {
    label: "Meilleur badge",
    icon: '🎖️',
    color: '#F59E0B',
  });

  const totalBadges = await prisma.userBadge.count({ where: { userId } });
  const topBadge = await prisma.userBadge.findFirst({
    where: { userId },
    orderBy: { badge: { rarity: 'desc' } },
    select: {
      earnedAt: true,
      badge: { select: { id: true, name: true, icon: true, color: true, rarity: true } },
    },
  });

  return {
    widgetType: 'TOP_BADGE',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 5,
    badgeId: topBadge?.badge.id ?? null,
    badgeName: topBadge?.badge.name ?? null,
    badgeIcon: topBadge?.badge.icon ?? null,
    badgeColor: topBadge?.badge.color ?? null,
    badgeRarity: topBadge?.badge.rarity ?? null,
    earnedAt: topBadge?.earnedAt ?? null,
    totalBadges,
  };
}

/**
 * Build the CURRENT_CHALLENGE widget.
 */
export async function buildCurrentChallengeWidget(
  organizationId: string,
  userId: string,
): Promise<CurrentChallengeWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'CURRENT_CHALLENGE', {
    label: "Challenge en cours",
    icon: '⚔️',
    color: '#EF4444',
  });

  const participation = await prisma.challengeParticipant.findFirst({
    where: {
      userId,
      challenge: { organizationId, status: 'ACTIVE' },
    },
    orderBy: { joinedAt: 'desc' },
    select: {
      rank: true,
      progress: true,
      challenge: { select: { id: true, name: true, endDate: true, targetValue: true } },
    },
  });

  const progressPercent = participation?.challenge?.targetValue && participation?.progress
    ? Math.min(100, Math.round((Number(participation.progress) / Number(participation.challenge.targetValue)) * 100))
    : null;

  return {
    widgetType: 'CURRENT_CHALLENGE',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 6,
    challengeId: participation?.challenge?.id ?? null,
    challengeName: participation?.challenge?.name ?? null,
    progressPercent,
    endsAt: participation?.challenge?.endDate ?? null,
    rank: participation?.rank ?? null,
  };
}

/**
 * Build the OBJECTIVES widget.
 */
export async function buildObjectivesWidget(
  organizationId: string,
  userId: string,
): Promise<ObjectivesWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'OBJECTIVES', {
    label: "Mes objectifs",
    icon: '🎯',
    color: '#10B981',
  });

  const goals = await prisma.goal.findMany({
    where: { userId, organizationId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    orderBy: { endDate: 'asc' },
    take: 5,
    select: {
      id: true,
      name: true,
      status: true,
      endDate: true,
      targetValue: true,
      progress: { orderBy: { recordedAt: 'desc' }, take: 1, select: { value: true } },
    },
  });

  const goalDtos = goals.map((g) => {
    const latest = g.progress[0];
    const pct = latest && g.targetValue
      ? Math.min(100, Math.round((Number(latest.value) / Number(g.targetValue)) * 100))
      : 0;
    return {
      goalId: g.id,
      name: g.name,
      progressPercent: pct,
      status: g.status,
      endsAt: g.endDate,
    };
  });

  const completedGoals = goalDtos.filter((g) => g.status === 'COMPLETED').length;

  return {
    widgetType: 'OBJECTIVES',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 7,
    goals: goalDtos,
    totalGoals: goals.length,
    completedGoals,
  };
}

/**
 * Build the NOTIFICATIONS_SUMMARY widget.
 * Reads from the notification system (future — returns empty for now).
 */
export async function buildNotificationSummaryWidget(
  organizationId: string,
  userId: string,
): Promise<NotificationSummaryWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'NOTIFICATIONS_SUMMARY', {
    label: "Notifications",
    icon: '🔔',
    color: '#6366F1',
  });

  // Future: read from a Notification model when it exists
  // For now: return ProgressionEvents as notification-like items
  const events = await prisma.progressionEvent.findMany({
    where: { userId, organizationId, notified: false },
    orderBy: { occurredAt: 'desc' },
    take: 5,
    select: { id: true, type: true, occurredAt: true, newValue: true },
  });

  const unreadCount = await prisma.progressionEvent.count({
    where: { userId, organizationId, notified: false },
  });

  return {
    widgetType: 'NOTIFICATIONS_SUMMARY',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 8,
    unreadCount,
    recentNotifications: events.map((e) => ({
      id: e.id,
      title: e.type.replace(/_/g, ' '),
      type: e.type,
      createdAt: e.occurredAt,
      isRead: false,
    })),
  };
}

/**
 * Build the LEADERBOARD_PREVIEW widget.
 */
export async function buildLeaderboardPreviewWidget(
  organizationId: string,
  userId: string,
): Promise<LeaderboardPreviewWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'LEADERBOARD_PREVIEW', {
    label: "Classement",
    icon: '📊',
    color: '#F59E0B',
  });

  const activeLeaderboard = await prisma.leaderboard.findFirst({
    where: { organizationId, isActive: true, isPublic: true },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true },
  });

  let entries: LeaderboardPreviewWidget['entries'] = [];
  let userRank: number | null = null;

  if (activeLeaderboard) {
    const topEntries = await prisma.leaderboardEntry.findMany({
      where: { leaderboardId: activeLeaderboard.id },
      orderBy: { rank: 'asc' },
      take: 5,
      select: {
        rank: true,
        userId: true,
        value: true,
        delta: true,
        user: { select: { name: true, publicProfile: { select: { avatarUrl: true } } } },
      },
    });

    entries = topEntries.map((e) => ({
      rank: e.rank,
      userId: e.userId,
      userName: e.user.name ?? null,
      avatarUrl: e.user.publicProfile?.avatarUrl ?? null,
      score: Number(e.value),
      unit: null,
      delta: e.delta ? Number(e.delta) : null,
      isCurrentUser: e.userId === userId,
    }));

    const userEntry = await prisma.leaderboardEntry.findFirst({
      where: { leaderboardId: activeLeaderboard.id, userId },
      select: { rank: true },
    });
    userRank = userEntry?.rank ?? null;
  }

  return {
    widgetType: 'LEADERBOARD_PREVIEW',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 9,
    leaderboardId: activeLeaderboard?.id ?? null,
    leaderboardName: activeLeaderboard?.name ?? null,
    entries,
    userRank,
  };
}

/**
 * Build the XP_CARD widget (mobile-first).
 */
export async function buildXpCardWidget(
  organizationId: string,
  userId: string,
): Promise<XpCardWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'XP_CARD', {
    label: "Ma progression",
    icon: '⭐',
    color: '#6366F1',
  });

  const userExp = await prisma.userExperience.findUnique({
    where: { userId },
    select: { currentLevel: true, totalXp: true, currentLevelXp: true, nextLevelXp: true },
  });

  const level = userExp?.currentLevel ?? 1;
  const levelDef = await prisma.levelDefinition.findFirst({
    where: { OR: [{ organizationId }, { isDefault: true }], level },
    orderBy: { organizationId: 'asc' },
    select: { title: true, icon: true, color: true },
  });

  const nextLevelDef = await prisma.levelDefinition.findFirst({
    where: { OR: [{ organizationId }, { isDefault: true }], level: level + 1 },
    orderBy: { organizationId: 'asc' },
    select: { title: true, rewardJson: true },
  });

  const currentLevelXp = userExp?.currentLevelXp ?? 0;
  const nextLevelXp = userExp?.nextLevelXp ?? 100;
  const progressPercent = nextLevelXp > 0
    ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100))
    : 100;

  const reward = nextLevelDef?.rewardJson as Record<string, unknown> | null;
  const nextRewardLabel = reward && typeof reward === 'object' && Object.keys(reward).length > 0
    ? (reward['label'] as string | undefined) ?? nextLevelDef?.title ?? null
    : null;

  return {
    widgetType: 'XP_CARD',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 10,
    level,
    levelTitle: levelDef?.title ?? `Niveau ${level}`,
    levelIcon: levelDef?.icon ?? null,
    levelColor: levelDef?.color ?? null,
    totalXp: userExp?.totalXp ?? 0,
    progressPercent,
    remainingXp: Math.max(0, nextLevelXp - currentLevelXp),
    nextRewardLabel,
  };
}

/**
 * Build the QUICK_ACTIONS widget.
 */
export async function buildQuickActionsWidget(
  organizationId: string,
  userId: string,
): Promise<QuickActionsWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'QUICK_ACTIONS', {
    label: "Actions rapides",
    icon: '⚡',
    color: '#6366F1',
  });

  // Default quick actions — org can override via WidgetConfig.config
  const defaultActions = [
    { key: 'new_prospect',  label: 'Nouveau prospect',  icon: '👤', route: '/prospects/new',   isEnabled: true },
    { key: 'new_client',    label: 'Nouveau client',    icon: '🤝', route: '/clients/new',     isEnabled: true },
    { key: 'add_kpi',       label: 'Saisir un KPI',     icon: '📊', route: '/kpi/new',         isEnabled: true },
    { key: 'view_leaderboard', label: 'Classement',     icon: '🏆', route: '/leaderboard',     isEnabled: true },
    { key: 'view_goals',    label: 'Mes objectifs',     icon: '🎯', route: '/goals',            isEnabled: true },
  ];

  const customActions = (meta.config['actions'] as typeof defaultActions | undefined) ?? defaultActions;

  return {
    widgetType: 'QUICK_ACTIONS',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 11,
    actions: customActions,
  };
}

/**
 * Build the AI_COACH widget.
 * Reads today's DailyCoachMessage (no AI calls — reads pre-generated messages).
 */
export async function buildAiCoachWidget(
  organizationId: string,
  userId: string,
): Promise<AiCoachWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'AI_COACH', {
    label: "Coach du jour",
    icon: '🤖',
    color: '#8B5CF6',
  });

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const coachMsg = await prisma.dailyCoachMessage.findFirst({
    where: {
      userId,
      organizationId,
      date: { gte: startOfDay },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, type: true, title: true, body: true, isRead: true, createdAt: true },
  });

  return {
    widgetType: 'AI_COACH',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 12,
    message: coachMsg
      ? {
          type: coachMsg.type as any,
          title: coachMsg.title,
          body: coachMsg.body,
          cta: null,
          priority: 'MEDIUM',
          generatedAt: coachMsg.createdAt,
        }
      : null,
    hasNewMessage: coachMsg ? !coachMsg.isRead : false,
  };
}

/**
 * Build the REPUTATION_SCORE widget.
 */
export async function buildReputationScoreWidget(
  organizationId: string,
  userId: string,
): Promise<ReputationScoreWidget> {
  const meta = await resolveWidgetConfig(organizationId, 'REPUTATION_SCORE', {
    label: "Réputation",
    icon: '⭐',
    color: '#F59E0B',
  });

  const repIndex = await prisma.userReputationIndex.findUnique({
    where: { userId },
    select: { globalScore: true, percentile: true, rankInOrganization: true },
  });

  return {
    widgetType: 'REPUTATION_SCORE',
    label: meta.label,
    icon: meta.icon,
    color: meta.color,
    isVisible: meta.isEnabled,
    position: 13,
    globalScore: repIndex?.globalScore ? Number(repIndex.globalScore) : null,
    percentile: repIndex?.percentile ? Number(repIndex.percentile) : null,
    rankInOrganization: repIndex?.rankInOrganization ?? null,
    trend: null, // Future: compute from history
  };
}
