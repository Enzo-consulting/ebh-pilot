/**
 * index.ts — Dashboard Engine Barrel Export
 *
 * Ticket 021D — Dashboard Engine & Public Profiles
 *
 * Single import point for all Dashboard Engine functionality.
 * External modules (routes, workers, mobile BFF) should import from here.
 *
 * Usage:
 *   import { getDashboard, getUserProfile, getActivityFeed } from '../dashboard/index.js';
 */

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getDashboard,
  getSalesDashboard,
  getMobileDashboard,
  getManagerDashboard,
  getExecutiveDashboard,
  getRealtimeSnapshot,
} from './dashboardService.js';

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getUserProfile,
  updateProfile,
  recordProfileView,
  getProfileViewers,
  resolveBranding,
} from './profileService.js';

// ─────────────────────────────────────────────────────────────────────────────
// WIDGET SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export {
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

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY FEED SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export {
  getActivityFeed,
  getActivityPreview,
} from './activityFeedService.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type {
  BrandingConfig,
  WidgetMeta,
  WidgetDto,
  TodayScoreWidget,
  CurrentStreakWidget,
  TodayRankingWidget,
  CurrentLevelWidget,
  ProgressBarWidget,
  TopBadgeWidget,
  CurrentChallengeWidget,
  ObjectivesWidget,
  NotificationSummaryWidget,
  AgendaSummaryWidget,
  RecentDocumentsWidget,
  RecentActivityWidget,
  LeaderboardPreviewWidget,
  XpCardWidget,
  QuickActionsWidget,
  AiCoachWidget,
  ReputationScoreWidget,
  ActivityDto,
  ActivityFeedDto,
  LeaderboardPreviewDto,
  UserProfileDto,
  BaseDashboardDto,
  DashboardDto,
  MobileDashboardDto,
  ManagerDashboardDto,
  ExecutiveDashboardDto,
  RealtimeSnapshotDto,
  AiCoachMessageDto,
  AiRecommendationsDto,
  PremiumProfileStatsDto,
  GetDashboardParams,
  GetActivityFeedParams,
  UpdateProfileParams,
} from './types.js';
