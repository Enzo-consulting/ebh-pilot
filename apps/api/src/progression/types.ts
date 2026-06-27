/**
 * types.ts — Progression Engine Types
 *
 * Ticket 021C — XP Engine & Progression
 *
 * All TypeScript interfaces, types and constants for the Progression Engine.
 * No business logic here — only contracts shared across services.
 *
 * ARCHITECTURE:
 * - XpService     → grants / removes XP, persists XpTransaction
 * - LevelService  → resolves LevelDefinition, computes progress %
 * - PromotionService → detects level-ups, writes UserLevelHistory, emits DomainEvents
 *
 * COMPATIBILITY:
 * - Ticket 014  Multi-tenant  : organizationId on every model
 * - Ticket 017  Event Bus     : DomainEvent.USER_LEVEL_UP emitted on promotion
 * - Ticket 018  Audit         : XpTransaction is the immutable audit trail
 * - Ticket 019  Tenant Config : XP amounts read from OrganizationSetting via getSetting()
 * - Ticket 020  Perf Engine   : feeds XP from badge/challenge/goal outcomes
 * - Ticket 021A KPI Engine    : KPI_RECORDED events can trigger XP grants (hook ready)
 * - Ticket 021B Ranking       : totalXp exposed for leaderboard computation
 */

// ─────────────────────────────────────────────────────────────────────────────
// XP SOURCE EVENTS — mirrors Prisma XpSourceEvent enum
// ─────────────────────────────────────────────────────────────────────────────

export const XP_SOURCE_EVENTS = {
  PROSPECT_CREATED:     'PROSPECT_CREATED',
  CLIENT_CREATED:       'CLIENT_CREATED',
  SALE_COMPLETED:       'SALE_COMPLETED',
  GOAL_REACHED:         'GOAL_REACHED',
  CHALLENGE_COMPLETED:  'CHALLENGE_COMPLETED',
  BADGE_EARNED:         'BADGE_EARNED',
  DAILY_LOGIN:          'DAILY_LOGIN',
  STREAK_BONUS:         'STREAK_BONUS',
  LEVEL_BONUS:          'LEVEL_BONUS',
  SEASON_BONUS:         'SEASON_BONUS',
  MANUAL_GRANT:         'MANUAL_GRANT',
  MANUAL_DEDUCT:        'MANUAL_DEDUCT',
  CORRECTION:           'CORRECTION',
  CUSTOM:               'CUSTOM',
} as const;

export type XpSourceEvent = typeof XP_SOURCE_EVENTS[keyof typeof XP_SOURCE_EVENTS];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM LEVEL DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default level definitions used when an organization has not customized its
 * level ladder. These are seeded once at startup and flagged isDefault=true.
 *
 * Formula: minXp = (level - 1)^2 * 100  (quadratic progression)
 * Level  1 = 0 XP      "Recrue"
 * Level  2 = 100 XP    "Junior"
 * Level  3 = 400 XP    "Confirmé"
 * Level  4 = 900 XP    "Senior"
 * Level  5 = 1 600 XP  "Expert"
 * Level  6 = 2 500 XP  "Spécialiste"
 * Level  7 = 3 600 XP  "Référent"
 * Level  8 = 4 900 XP  "Leader"
 * Level  9 = 6 400 XP  "Champion"
 * Level 10 = 8 100 XP  "Légende"
 */
export const SYSTEM_LEVELS: SystemLevelSeed[] = [
  { level: 1,  title: 'Recrue',       minXp: 0,     icon: '🌱', color: '#94A3B8' },
  { level: 2,  title: 'Junior',       minXp: 100,   icon: '⚡', color: '#60A5FA' },
  { level: 3,  title: 'Confirmé',     minXp: 400,   icon: '🔥', color: '#34D399' },
  { level: 4,  title: 'Senior',       minXp: 900,   icon: '💪', color: '#FBBF24' },
  { level: 5,  title: 'Expert',       minXp: 1600,  icon: '🎯', color: '#F97316' },
  { level: 6,  title: 'Spécialiste',  minXp: 2500,  icon: '🏆', color: '#EF4444' },
  { level: 7,  title: 'Référent',     minXp: 3600,  icon: '🌟', color: '#8B5CF6' },
  { level: 8,  title: 'Leader',       minXp: 4900,  icon: '👑', color: '#EC4899' },
  { level: 9,  title: 'Champion',     minXp: 6400,  icon: '⚔️',  color: '#F59E0B' },
  { level: 10, title: 'Légende',      minXp: 8100,  icon: '🦁', color: '#6366F1' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM XP DEFAULTS — overridable via OrganizationSetting (Ticket 019)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Setting keys used with getSetting() to retrieve per-org XP amounts.
 * If a key is absent from OrganizationSetting, the value below is used.
 */
export const XP_SETTING_KEYS = {
  PROSPECT_CREATED:    'xp_prospect_created',
  CLIENT_CREATED:      'xp_client_created',
  SALE_COMPLETED:      'xp_sale_completed',
  GOAL_REACHED:        'xp_goal_reached',
  CHALLENGE_COMPLETED: 'xp_challenge_completed',
  BADGE_COMMON:        'xp_badge_common',
  BADGE_RARE:          'xp_badge_rare',
  BADGE_EPIC:          'xp_badge_epic',
  BADGE_LEGENDARY:     'xp_badge_legendary',
  DAILY_LOGIN:         'xp_daily_login',
  STREAK_BONUS:        'xp_streak_bonus',
  LEVEL_BONUS:         'xp_level_bonus',
} as const;

export type XpSettingKey = typeof XP_SETTING_KEYS[keyof typeof XP_SETTING_KEYS];

/** Default XP values (fallback when no OrganizationSetting is defined) */
export const XP_DEFAULTS: Record<XpSettingKey, number> = {
  xp_prospect_created:    10,
  xp_client_created:      25,
  xp_sale_completed:      50,
  xp_goal_reached:        100,
  xp_challenge_completed: 75,
  xp_badge_common:        15,
  xp_badge_rare:          30,
  xp_badge_epic:          60,
  xp_badge_legendary:     150,
  xp_daily_login:         5,
  xp_streak_bonus:        20,
  xp_level_bonus:         0,   // set per LevelDefinition.rewardJson
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT / PARAMS TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Parameters required to grant or remove XP */
export interface GrantXpParams {
  organizationId: string;
  userId: string;
  xp: number;
  sourceEvent: XpSourceEvent;
  sourceResource?: string;
  sourceResourceId?: string;
  reason?: string;
  seasonId?: string;
  metadata?: Record<string, unknown>;
}

/** Parameters for the removeXp operation (internally negates the xp) */
export type RemoveXpParams = GrantXpParams;

/** Parameters to recalculate a user's level from their current XP */
export interface RecalculateLevelParams {
  organizationId: string;
  userId: string;
  /** If true, will emit USER_LEVEL_UP DomainEvent and create UserLevelHistory */
  emitEvents?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Full snapshot of a user's XP & level state — safe for API responses */
export interface UserExperienceSnapshot {
  userId: string;
  organizationId: string;
  totalXp: number;
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  lifetimeXp: number;
  progressPercent: number;          // 0–100
  remainingXp: number;              // XP needed to reach next level
  currentLevelTitle: string;
  nextLevelTitle: string | null;
  currentLevelIcon: string | null;
  currentLevelColor: string | null;
  updatedAt: Date;
}

/** Result of a grantXp / removeXp operation */
export interface XpOperationResult {
  success: boolean;
  xpGranted: number;
  balanceBefore: number;
  balanceAfter: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  newLevelTitle: string | null;
  transactionId: string;
}

/** Result of a level recalculation */
export interface LevelRecalculationResult {
  userId: string;
  previousLevel: number;
  newLevel: number;
  levelChanged: boolean;
  promoted: boolean;        // level went up
  demoted: boolean;         // level went down (e.g., after season reset)
  xpAtCalculation: number;
}

/** Compact leaderboard entry for top XP users */
export interface XpLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string | null;
  organizationId: string;
  totalXp: number;
  currentLevel: number;
  currentLevelTitle: string;
  lifetimeXp: number;
}

/** Next reward to be unlocked (from LevelDefinition.rewardJson) */
export interface NextRewardPreview {
  level: number;
  title: string;
  icon: string | null;
  color: string | null;
  xpRequired: number;
  remainingXp: number;
  rewardJson: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Seed shape for system-level defaults */
export interface SystemLevelSeed {
  level: number;
  title: string;
  minXp: number;
  icon: string;
  color: string;
}

/** Resolved level definition (merged org + system) */
export interface ResolvedLevel {
  level: number;
  title: string;
  minXp: number;
  icon: string | null;
  color: string | null;
  rewardJson: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT BUS HOOK TYPES (Ticket 017)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of the payload emitted when a USER_LEVEL_UP event fires.
 * Consumed by: NotificationEngine, ActivityFeedEngine, CoachEngine (future).
 */
export interface UserLevelUpPayload {
  organizationId: string;
  userId: string;
  previousLevel: number;
  newLevel: number;
  newLevelTitle: string;
  newLevelIcon: string | null;
  xpAtPromotion: number;
  promotedAt: Date;
}

/**
 * Shape of the payload emitted when an XP_GAINED event fires.
 */
export interface XpGainedPayload {
  organizationId: string;
  userId: string;
  xp: number;
  balanceAfter: number;
  sourceEvent: XpSourceEvent;
  transactionId: string;
}
