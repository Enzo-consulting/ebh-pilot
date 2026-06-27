/**
 * types.ts — Dashboard Engine Types & DTOs
 *
 * Ticket 021D — Dashboard Engine & Public Profiles
 *
 * All TypeScript interfaces, DTOs and constants for the Dashboard Engine.
 * No business logic here — only data contracts.
 *
 * ARCHITECTURE:
 * - dashboardService    → aggregates all engines into a single dashboard response
 * - profileService      → reads/writes UserPublicProfile
 * - widgetService       → builds individual widget DTOs
 * - activityFeedService → unified timeline from all event sources
 *
 * COMPATIBILITY:
 * - Ticket 014C White Label: BrandingConfig + all DTOs carry branding fields
 * - Ticket 016 Modules: only enabled modules contribute to dashboard data
 * - Ticket 017 Event Bus: ActivityFeedEvent sourced from DomainEvents
 * - Ticket 019 Tenant Config: widget labels/colors via OrganizationSetting
 * - Ticket 020 Performance: KPI, badges, challenges, goals aggregated
 * - Ticket 021A KPI: current KPI values per user
 * - Ticket 021B Ranking: leaderboard positions
 * - Ticket 021C Progression: XP, levels, progress
 */

// ─────────────────────────────────────────────────────────────────────────────
// BRANDING (White Label — Ticket 014C)
// ─────────────────────────────────────────────────────────────────────────────

/** Per-organization branding configuration applied to all DTOs */
export interface BrandingConfig {
  organizationId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  fontFamily: string | null;
  /** Custom name shown in UI (e.g. "MyCompany Performance") */
  appName: string;
  /** Custom level vocabulary (e.g. "Rank" instead of "Level") */
  levelLabel: string;
  xpLabel: string;
  /** Custom unit for the primary KPI (e.g. "€", "units", "calls") */
  primaryKpiUnit: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WIDGET DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Base widget metadata */
export interface WidgetMeta {
  widgetType: string;
  label: string;
  icon: string | null;
  color: string;
  isVisible: boolean;
  position: number;
}

/** Today's score widget */
export interface TodayScoreWidget extends WidgetMeta {
  widgetType: 'TODAY_SCORE';
  score: number | null;
  unit: string | null;
  delta: number | null;
  deltaPercent: number | null;
  isPositive: boolean;
}

/** Current streak widget */
export interface CurrentStreakWidget extends WidgetMeta {
  widgetType: 'CURRENT_STREAK';
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
}

/** Today's ranking widget */
export interface TodayRankingWidget extends WidgetMeta {
  widgetType: 'TODAY_RANKING';
  rank: number | null;
  totalParticipants: number | null;
  scope: string;
  delta: number | null;
}

/** Current level + XP progress widget */
export interface CurrentLevelWidget extends WidgetMeta {
  widgetType: 'CURRENT_LEVEL';
  level: number;
  levelTitle: string;
  levelIcon: string | null;
  levelColor: string | null;
  totalXp: number;
  lifetimeXp: number;
}

/** XP progress bar widget */
export interface ProgressBarWidget extends WidgetMeta {
  widgetType: 'PROGRESS_BAR';
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  remainingXp: number;
  nextLevelTitle: string | null;
}

/** Top badge widget */
export interface TopBadgeWidget extends WidgetMeta {
  widgetType: 'TOP_BADGE';
  badgeId: string | null;
  badgeName: string | null;
  badgeIcon: string | null;
  badgeColor: string | null;
  badgeRarity: string | null;
  earnedAt: Date | null;
  totalBadges: number;
}

/** Active challenge widget */
export interface CurrentChallengeWidget extends WidgetMeta {
  widgetType: 'CURRENT_CHALLENGE';
  challengeId: string | null;
  challengeName: string | null;
  progressPercent: number | null;
  endsAt: Date | null;
  rank: number | null;
}

/** Objectives / goals widget */
export interface ObjectivesWidget extends WidgetMeta {
  widgetType: 'OBJECTIVES';
  goals: Array<{
    goalId: string;
    name: string;
    progressPercent: number;
    status: string;
    endsAt: Date;
  }>;
  totalGoals: number;
  completedGoals: number;
}

/** Notifications summary widget */
export interface NotificationSummaryWidget extends WidgetMeta {
  widgetType: 'NOTIFICATIONS_SUMMARY';
  unreadCount: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: Date;
    isRead: boolean;
  }>;
}

/** Agenda summary widget */
export interface AgendaSummaryWidget extends WidgetMeta {
  widgetType: 'AGENDA_SUMMARY';
  upcomingEvents: Array<{
    id: string;
    title: string;
    startsAt: Date;
    type: string;
  }>;
}

/** Recent documents widget */
export interface RecentDocumentsWidget extends WidgetMeta {
  widgetType: 'RECENT_DOCUMENTS';
  documents: Array<{
    id: string;
    name: string;
    type: string;
    createdAt: Date;
    url: string | null;
  }>;
}

/** Recent activity widget */
export interface RecentActivityWidget extends WidgetMeta {
  widgetType: 'RECENT_ACTIVITY';
  activities: ActivityDto[];
}

/** Leaderboard preview widget */
export interface LeaderboardPreviewWidget extends WidgetMeta {
  widgetType: 'LEADERBOARD_PREVIEW';
  leaderboardId: string | null;
  leaderboardName: string | null;
  entries: LeaderboardPreviewDto[];
  userRank: number | null;
}

/** XP card widget (mobile-first) */
export interface XpCardWidget extends WidgetMeta {
  widgetType: 'XP_CARD';
  level: number;
  levelTitle: string;
  levelIcon: string | null;
  levelColor: string | null;
  totalXp: number;
  progressPercent: number;
  remainingXp: number;
  nextRewardLabel: string | null;
}

/** Quick actions widget */
export interface QuickActionsWidget extends WidgetMeta {
  widgetType: 'QUICK_ACTIONS';
  actions: Array<{
    key: string;
    label: string;
    icon: string;
    route: string;
    isEnabled: boolean;
  }>;
}

/** AI Coach widget — data hook, no AI call */
export interface AiCoachWidget extends WidgetMeta {
  widgetType: 'AI_COACH';
  message: AiCoachMessageDto | null;
  hasNewMessage: boolean;
}

/** Reputation score widget */
export interface ReputationScoreWidget extends WidgetMeta {
  widgetType: 'REPUTATION_SCORE';
  globalScore: number | null;
  percentile: number | null;
  rankInOrganization: number | null;
  trend: 'up' | 'down' | 'stable' | null;
}

/** Union type of all widgets */
export type WidgetDto =
  | TodayScoreWidget
  | CurrentStreakWidget
  | TodayRankingWidget
  | CurrentLevelWidget
  | ProgressBarWidget
  | TopBadgeWidget
  | CurrentChallengeWidget
  | ObjectivesWidget
  | NotificationSummaryWidget
  | AgendaSummaryWidget
  | RecentDocumentsWidget
  | RecentActivityWidget
  | LeaderboardPreviewWidget
  | XpCardWidget
  | QuickActionsWidget
  | AiCoachWidget
  | ReputationScoreWidget;

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** A single activity entry in the unified timeline */
export interface ActivityDto {
  id: string;
  type: string;
  /** Human-readable title (e.g. "+150 XP", "Badge débloqué") */
  title: string;
  body: string | null;
  icon: string | null;
  color: string | null;
  /** Actor name (current user or another user) */
  actorName: string | null;
  actorAvatarUrl: string | null;
  occurredAt: Date;
  /** Optional deep link to the related resource */
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
}

/** Paginated activity feed response */
export interface ActivityFeedDto {
  items: ActivityDto[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD PREVIEW DTO
// ─────────────────────────────────────────────────────────────────────────────

export interface LeaderboardPreviewDto {
  rank: number;
  userId: string;
  userName: string | null;
  avatarUrl: string | null;
  score: number;
  unit: string | null;
  delta: number | null;
  isCurrentUser: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE DTO
// ─────────────────────────────────────────────────────────────────────────────

export interface UserProfileDto {
  userId: string;
  organizationId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  jobTitle: string | null;
  joinedAt: Date | null;
  currentLevel: number;
  levelTitle: string;
  levelIcon: string | null;
  levelColor: string | null;
  lifetimeXp: number;
  currentRank: number | null;
  reputationScore: number | null;
  totalSales: number;
  totalClients: number;
  totalProspects: number;
  profileViews: number;
  lastProfileView: Date | null;
  isPublicInsideOrganization: boolean;
  badgesVisible: boolean;
  achievementsVisible: boolean;
  statisticsVisible: boolean;
  /** Visible badges (respects badgesVisible flag) */
  badges: Array<{
    badgeId: string;
    name: string;
    icon: string | null;
    color: string | null;
    rarity: string;
    earnedAt: Date;
  }>;
  /** Custom profile links */
  customLinks: Array<{ label: string; url: string }>;
  createdAt: Date;
  updatedAt: Date;
  /** Branding context for White Label */
  branding: BrandingConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD DTOs
// ─────────────────────────────────────────────────────────────────────────────

/** Core dashboard data shared by all dashboard types */
export interface BaseDashboardDto {
  userId: string;
  organizationId: string;
  dashboardType: string;
  generatedAt: Date;
  branding: BrandingConfig;
}

/** Full sales rep dashboard */
export interface DashboardDto extends BaseDashboardDto {
  dashboardType: 'SALES_REP';
  widgets: WidgetDto[];
  recentActivity: ActivityDto[];
  profile: Pick<UserProfileDto, 'displayName' | 'avatarUrl' | 'currentLevel' | 'levelTitle' | 'levelIcon' | 'currentRank'>;
}

/** Mobile-optimized dashboard */
export interface MobileDashboardDto extends BaseDashboardDto {
  dashboardType: 'MOBILE';
  /** Core widgets ordered for mobile layout */
  topWidgets: [XpCardWidget, TodayRankingWidget, CurrentStreakWidget];
  quickActions: QuickActionsWidget;
  recentActivity: ActivityDto[];
  objectives: ObjectivesWidget;
  notifications: NotificationSummaryWidget;
  aiCoach: AiCoachWidget;
}

/** Manager dashboard */
export interface ManagerDashboardDto extends BaseDashboardDto {
  dashboardType: 'MANAGER';
  teamKpis: Array<{
    userId: string;
    userName: string | null;
    kpiCode: string;
    value: number;
    target: number | null;
    progressPercent: number | null;
    rank: number | null;
  }>;
  teamLeaderboard: LeaderboardPreviewDto[];
  teamActivity: ActivityDto[];
  teamObjectives: ObjectivesWidget;
}

/** Executive dashboard */
export interface ExecutiveDashboardDto extends BaseDashboardDto {
  dashboardType: 'EXECUTIVE';
  organizationKpis: Array<{
    kpiCode: string;
    kpiName: string;
    totalValue: number;
    averageValue: number;
    topPerformer: { userId: string; userName: string | null; value: number } | null;
  }>;
  topPerformers: LeaderboardPreviewDto[];
  recentActivity: ActivityDto[];
}

/** Realtime snapshot (lightweight, for polling/websocket) */
export interface RealtimeSnapshotDto {
  userId: string;
  organizationId: string;
  timestamp: Date;
  xp: { total: number; delta: number | null };
  level: { current: number; title: string };
  rank: { current: number | null; delta: number | null };
  streak: { current: number };
  unreadNotifications: number;
  pendingGoals: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI HOOKS (no AI calls — interfaces only)
// ─────────────────────────────────────────────────────────────────────────────

/** Daily coach message produced by a future AI engine */
export interface AiCoachMessageDto {
  type: 'DAILY_SUMMARY' | 'GOAL_REMINDER' | 'ENCOURAGEMENT' | 'PROGRESSION_INSIGHT' | 'ADVICE' | 'ALERT' | 'CONGRATULATION';
  title: string | null;
  body: string;
  /** Suggested action for the user to take */
  cta: { label: string; route: string } | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  generatedAt: Date;
}

/** AI-generated recommendation hooks (future OpenAI integration) */
export interface AiRecommendationsDto {
  /** Recommended daily objective */
  recommendedObjective: { description: string; kpiCode: string; targetValue: number } | null;
  /** Client to contact today */
  clientToContact: { clientId: string; clientName: string; reason: string } | null;
  /** Document to follow up on */
  documentToFollow: { documentId: string; name: string; daysAgo: number } | null;
  /** Churn risk alert */
  churnRisk: { clientId: string; clientName: string; riskScore: number } | null;
  /** Personalized motivation message */
  motivationMessage: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM GAMIFICATION HOOKS (no logic — interfaces only)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Premium profile analytics.
 * Populated only for premium organizations or premium users.
 * All fields null if feature is disabled.
 */
export interface PremiumProfileStatsDto {
  /** Users who viewed this profile (premium feature) */
  profileViewers: Array<{
    userId: string;
    userName: string | null;
    avatarUrl: string | null;
    viewedAt: Date;
  }> | null;
  /** Relative popularity score (views, mentions, activity) */
  popularityScore: number | null;
  /** Influence index based on rank, XP, badges */
  influenceScore: number | null;
  followerCount: number | null;
  mentionCount: number | null;
  engagementScore: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT / PARAMS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GetDashboardParams {
  organizationId: string;
  userId: string;
  /** ISO date — defaults to today */
  date?: Date;
  /** Max activity items to include */
  activityLimit?: number;
}

export interface GetActivityFeedParams {
  organizationId: string;
  userId: string;
  /** Pagination cursor (activityFeedEvent.id) */
  cursor?: string;
  limit?: number;
  /** Filter by event types */
  types?: string[];
}

export interface UpdateProfileParams {
  organizationId: string;
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  jobTitle?: string;
  badgesVisible?: boolean;
  achievementsVisible?: boolean;
  statisticsVisible?: boolean;
  isPublicInsideOrganization?: boolean;
  customLinks?: Array<{ label: string; url: string }>;
}
