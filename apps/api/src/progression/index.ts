/**
 * index.ts — Progression Engine Barrel Export
 *
 * Ticket 021C — XP Engine & Progression
 *
 * Single import point for all Progression Engine functionality.
 * External modules should import from here, not from sub-files directly.
 *
 * Usage:
 *   import { grantXp, getUserExperience, recalculateLevel } from '../progression/index.js';
 *
 * ─── EVENT BUS HOOKS (future subscriptions) ───────────────────────────────
 *
 * The following events are candidates for automatic XP grants.
 * DO NOT connect them yet — hooks are prepared here for future Ticket 022.
 *
 * When implemented, a ProgressionListener will subscribe to:
 *
 *   DomainEvent.PROSPECT_CREATED    → grantXp({ sourceEvent: 'PROSPECT_CREATED', ... })
 *   DomainEvent.CLIENT_CREATED      → grantXp({ sourceEvent: 'CLIENT_CREATED', ... })
 *   DomainEvent.SALE_COMPLETED      → grantXp({ sourceEvent: 'SALE_COMPLETED', ... })
 *   DomainEvent.GOAL_REACHED        → grantXp({ sourceEvent: 'GOAL_REACHED', ... })
 *   DomainEvent.BADGE_EARNED        → grantXp({ sourceEvent: 'BADGE_EARNED', ... })
 *   DomainEvent.CHALLENGE_COMPLETED → grantXp({ sourceEvent: 'CHALLENGE_COMPLETED', ... })
 *   DomainEvent.USER_CREATED        → initialize UserExperience at level 1
 *
 * Example listener (do NOT uncomment yet):
 *
 *   // import { eventBus } from '../events/index.js';
 *   // import { DomainEvent } from '../events/types.js';
 *   // import { grantXp } from './xpService.js';
 *   // import { XP_SETTING_KEYS } from './types.js';
 *   //
 *   // eventBus.on(DomainEvent.PROSPECT_CREATED, async (payload) => {
 *   //   await grantXp({
 *   //     organizationId: payload.organizationId,
 *   //     userId: payload.userId,
 *   //     xp: await resolveXpAmount(payload.organizationId, XP_SETTING_KEYS.PROSPECT_CREATED),
 *   //     sourceEvent: 'PROSPECT_CREATED',
 *   //     sourceResource: 'Prospect',
 *   //     sourceResourceId: payload.resourceId,
 *   //   });
 *   // });
 */

// ─────────────────────────────────────────────────────────────────────────────
// XP SERVICE — XP grant/remove mutations
// ─────────────────────────────────────────────────────────────────────────────

export {
  grantXp,
  removeXp,
  getUserExperience,
  getRemainingXp,
  getTopXpUsers,
  resolveXpAmount,
  XP_SETTING_KEYS,
  XP_DEFAULTS,
} from './xpService.js';

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL SERVICE — read-only level resolution & progress computation
// ─────────────────────────────────────────────────────────────────────────────

export {
  getLevelDefinitions,
  resolveLevel,
  getCurrentLevel,
  computeProgress,
  getProgressPercentage,
  getNextReward,
  seedSystemLevels,
} from './levelService.js';

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTION SERVICE — level-up/demotion detection & history
// ─────────────────────────────────────────────────────────────────────────────

export {
  recalculateLevel,
  bulkRecalculateLevels,
} from './promotionService.js';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — all shared contracts
// ─────────────────────────────────────────────────────────────────────────────

export type {
  XpSourceEvent,
  XpSettingKey,
  GrantXpParams,
  RemoveXpParams,
  RecalculateLevelParams,
  UserExperienceSnapshot,
  XpOperationResult,
  LevelRecalculationResult,
  XpLeaderboardEntry,
  NextRewardPreview,
  SystemLevelSeed,
  ResolvedLevel,
  UserLevelUpPayload,
  XpGainedPayload,
} from './types.js';

export {
  XP_SOURCE_EVENTS,
  SYSTEM_LEVELS,
} from './types.js';
