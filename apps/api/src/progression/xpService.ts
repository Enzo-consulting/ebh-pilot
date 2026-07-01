/**
 * xpService.ts — XP Grant / Remove Service
 *
 * Ticket 021C — XP Engine & Progression
 *
 * PURPOSE:
 * Single source of truth for all XP mutations.
 * Every gain or loss of XP MUST go through this service to ensure:
 *  - XpTransaction is always persisted (audit trail)
 *  - UserExperience totals are kept consistent
 *  - PromotionService is always called after a mutation
 *  - DomainEvents are always emitted
 *
 * ARCHITECTURE RULES:
 * - This service NEVER calculates level thresholds (delegated to LevelService)
 * - This service NEVER decides if a level-up occurred (delegated to PromotionService)
 * - All operations are multi-tenant safe (organizationId required)
 * - Prisma transactions ensure atomicity (XpTransaction + UserExperience update)
 *
 * FUTURE SCALABILITY:
 * Replace Prisma direct calls with a queue (Bull/BullMQ) for high-volume events.
 * The public interface (grantXp, removeXp) does not change.
 */

import { prisma } from '../prisma.js';
import { eventBus } from '../events/index.js';
import { DomainEvent } from '../events/types.js';
import {
  GrantXpParams,
  RemoveXpParams,
  XpOperationResult,
  UserExperienceSnapshot,
  XpLeaderboardEntry,
  XP_SETTING_KEYS,
  XP_DEFAULTS,
  type XpSettingKey,
} from './types.js';
import { recalculateLevel } from './promotionService.js';
import { resolveLevel } from './levelService.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve the XP amount for a given setting key.
 * Falls back to XP_DEFAULTS if the organization has not customized the value.
 * Integrates with Ticket 019 Tenant Configuration.
 */
async function getXpAmount(
  organizationId: string,
  settingKey: XpSettingKey,
): Promise<number> {
  try {
    const setting = await prisma.organizationSetting.findFirst({
      where: { organizationId, key: settingKey },
      select: { value: true },
    });
    if (setting?.value !== undefined && setting.value !== null) {
      const parsed = Number(setting.value);
      if (!isNaN(parsed)) return parsed;
    }
  } catch {
    // Graceful fallback — never block XP operations for config errors
  }
  return XP_DEFAULTS[settingKey] ?? 0;
}

/**
 * Upsert the UserExperience row and return the updated record.
 * Uses a Prisma transaction to guarantee atomicity.
 */
async function applyXpDelta(
  organizationId: string,
  userId: string,
  delta: number,
  sourceEvent: string,
  sourceResource: string | undefined,
  sourceResourceId: string | undefined,
  reason: string | undefined,
  seasonId: string | undefined,
  metadata: Record<string, unknown>,
): Promise<{
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
  levelBefore: number;
}> {
  return prisma.$transaction(async (tx) => {
    // 1. Upsert UserExperience (create if first XP operation for this user)
    const existing = await tx.userExperience.findUnique({
      where: { userId },
      select: { id: true, totalXp: true, currentLevel: true, lifetimeXp: true },
    });

    const balanceBefore = existing?.totalXp ?? 0;
    const levelBefore = existing?.currentLevel ?? 1;
    const newTotalXp = Math.max(0, balanceBefore + delta);
    const newLifetimeXp = (existing?.lifetimeXp ?? 0) + Math.max(0, delta);

    let userExp: { id: string };
    if (!existing) {
      userExp = await tx.userExperience.create({
        data: {
          organizationId,
          userId,
          totalXp: newTotalXp,
          currentLevel: 1,
          currentLevelXp: 0,
          nextLevelXp: 100,
          lifetimeXp: newLifetimeXp,
        },
        select: { id: true },
      });
    } else {
      userExp = await tx.userExperience.update({
        where: { userId },
        data: {
          totalXp: newTotalXp,
          lifetimeXp: newLifetimeXp,
        },
        select: { id: true },
      });
    }

    // 2. Create XpTransaction audit record
    const xpTx = await tx.xpTransaction.create({
      data: {
        organizationId,
        userId,
        userExperienceId: userExp.id,
        sourceEvent: sourceEvent as any,
        sourceResource,
        sourceResourceId,
        xp: delta,
        balanceAfter: newTotalXp,
        reason,
        metadata: metadata as any,
        seasonId,
      },
      select: { id: true },
    });

    return {
      transactionId: xpTx.id,
      balanceBefore,
      balanceAfter: newTotalXp,
      levelBefore,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Grant XP to a user.
 *
 * Atomically:
 *  1. Updates UserExperience (totalXp, lifetimeXp)
 *  2. Creates XpTransaction audit record
 *  3. Calls PromotionService to check for level-up
 *  4. Emits XP_GAINED DomainEvent
 *
 * @returns XpOperationResult with before/after state and level change info
 */
export async function grantXp(params: GrantXpParams): Promise<XpOperationResult> {
  const {
    organizationId,
    userId,
    xp,
    sourceEvent,
    sourceResource,
    sourceResourceId,
    reason,
    seasonId,
    metadata = {},
  } = params;

  if (xp <= 0) {
    throw new Error(`[xpService.grantXp] xp must be positive, got ${xp}`);
  }

  const { transactionId, balanceBefore, balanceAfter, levelBefore } =
    await applyXpDelta(
      organizationId,
      userId,
      xp,
      sourceEvent,
      sourceResource,
      sourceResourceId,
      reason,
      seasonId,
      metadata,
    );

  // Check for promotion (level-up) — PromotionService handles history + events
  const promotionResult = await recalculateLevel({
    organizationId,
    userId,
    emitEvents: true,
  });

  // Emit XP_GAINED event (fire-and-forget)
  eventBus.emit(DomainEvent.XP_GAINED, {
    eventId: transactionId,
    event: DomainEvent.XP_GAINED,
    organizationId,
    userId,
    resourceType: 'XpTransaction',
    resourceId: transactionId,
    occurredAt: new Date(),
    metadata: { xp, balanceAfter, sourceEvent },
  });

  return {
    success: true,
    xpGranted: xp,
    balanceBefore,
    balanceAfter,
    levelBefore,
    levelAfter: promotionResult.newLevel,
    leveledUp: promotionResult.promoted,
    newLevelTitle: promotionResult.promoted ? promotionResult.newLevelTitle ?? null : null,
    transactionId,
  };
}

/**
 * Remove XP from a user (e.g., correction, penalty).
 *
 * The XP floor is 0 — a user's totalXp never goes negative.
 * lifetimeXp is NOT reduced (it is a permanent historical counter).
 *
 * @returns XpOperationResult with before/after state
 */
export async function removeXp(params: RemoveXpParams): Promise<XpOperationResult> {
  const {
    organizationId,
    userId,
    xp,
    sourceEvent,
    sourceResource,
    sourceResourceId,
    reason,
    seasonId,
    metadata = {},
  } = params;

  if (xp <= 0) {
    throw new Error(`[xpService.removeXp] xp must be positive, got ${xp}`);
  }

  const { transactionId, balanceBefore, balanceAfter, levelBefore } =
    await applyXpDelta(
      organizationId,
      userId,
      -xp,
      sourceEvent,
      sourceResource,
      sourceResourceId,
      reason,
      seasonId,
      metadata,
    );

  // Recalculate level (may cause demotion after XP removal)
  const promotionResult = await recalculateLevel({
    organizationId,
    userId,
    emitEvents: true,
  });

  // Emit XP_REMOVED event (fire-and-forget)
  eventBus.emit(DomainEvent.XP_REMOVED, {
    eventId: transactionId,
    event: DomainEvent.XP_REMOVED,
    organizationId,
    userId,
    resourceType: 'XpTransaction',
    resourceId: transactionId,
    occurredAt: new Date(),
    metadata: { xp: -xp, balanceAfter, sourceEvent },
  });

  return {
    success: true,
    xpGranted: -xp,
    balanceBefore,
    balanceAfter,
    levelBefore,
    levelAfter: promotionResult.newLevel,
    leveledUp: false,
    newLevelTitle: null,
    transactionId,
  };
}

/**
 * Get the full XP & level snapshot for a user, enriched with UI-ready fields.
 * Returns null if the user has no XP record yet.
 */
export async function getUserExperience(
  organizationId: string,
  userId: string,
): Promise<UserExperienceSnapshot | null> {
  const userExp = await prisma.userExperience.findUnique({
    where: { userId },
    select: {
      totalXp: true,
      currentLevel: true,
      currentLevelXp: true,
      nextLevelXp: true,
      lifetimeXp: true,
      updatedAt: true,
    },
  });

  if (!userExp) return null;

  const currentLevelDef = await resolveLevel(organizationId, userExp.currentLevel);
  const nextLevelDef    = await resolveLevel(organizationId, userExp.currentLevel + 1);

  const progressPercent =
    userExp.nextLevelXp > 0
      ? Math.min(100, Math.round((userExp.currentLevelXp / userExp.nextLevelXp) * 100))
      : 100;

  const remainingXp = Math.max(0, userExp.nextLevelXp - userExp.currentLevelXp);

  return {
    userId,
    organizationId,
    totalXp: userExp.totalXp,
    currentLevel: userExp.currentLevel,
    currentLevelXp: userExp.currentLevelXp,
    nextLevelXp: userExp.nextLevelXp,
    lifetimeXp: userExp.lifetimeXp,
    progressPercent,
    remainingXp,
    currentLevelTitle: currentLevelDef?.title ?? `Level ${userExp.currentLevel}`,
    nextLevelTitle: nextLevelDef?.title ?? null,
    currentLevelIcon: currentLevelDef?.icon ?? null,
    currentLevelColor: currentLevelDef?.color ?? null,
    updatedAt: userExp.updatedAt,
  };
}

/**
 * Get the remaining XP needed by a user to reach the next level.
 * Returns 0 if the user is at the maximum level.
 */
export async function getRemainingXp(
  organizationId: string,
  userId: string,
): Promise<number> {
  const snapshot = await getUserExperience(organizationId, userId);
  return snapshot?.remainingXp ?? 0;
}

/**
 * Get the top N users by totalXp within an organization.
 * Useful for XP leaderboards and profile comparisons.
 *
 * @param limit   Number of users to return (default: 10, max: 100)
 */
export async function getTopXpUsers(
  organizationId: string,
  limit = 10,
): Promise<XpLeaderboardEntry[]> {
  const safeLimit = Math.min(limit, 100);

  const entries = await prisma.userExperience.findMany({
    where: { organizationId },
    orderBy: { totalXp: 'desc' },
    take: safeLimit,
    select: {
      userId: true,
      totalXp: true,
      currentLevel: true,
      lifetimeXp: true,
      user: { select: { name: true } },
    },
  });

  const results: XpLeaderboardEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    const levelDef = await resolveLevel(organizationId, e.currentLevel);
    results.push({
      rank: i + 1,
      userId: e.userId,
      userName: e.user.name,
      organizationId,
      totalXp: e.totalXp,
      currentLevel: e.currentLevel,
      currentLevelTitle: levelDef?.title ?? `Level ${e.currentLevel}`,
      lifetimeXp: e.lifetimeXp,
    });
  }
  return results;
}

/**
 * Resolve a setting-based XP amount for a given event type.
 * Used by external callers (e.g., Event Bus listeners) that need
 * the configured XP without performing a mutation.
 */
export async function resolveXpAmount(
  organizationId: string,
  settingKey: XpSettingKey,
): Promise<number> {
  return getXpAmount(organizationId, settingKey);
}

// Re-export setting keys for external consumers
export { XP_SETTING_KEYS, XP_DEFAULTS };
