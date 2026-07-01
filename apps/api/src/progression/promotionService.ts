/**
 * promotionService.ts — Level Promotion & Demotion Service
 *
 * Ticket 021C — XP Engine & Progression
 *
 * PURPOSE:
 * Detects level changes (promotion/demotion), writes UserLevelHistory,
 * updates UserExperience cached level fields, and emits DomainEvents.
 *
 * This service is the ONLY place allowed to:
 *  - Write UserLevelHistory records
 *  - Update currentLevel / currentLevelXp / nextLevelXp on UserExperience
 *  - Emit USER_LEVEL_UP DomainEvent
 *
 * CALLED BY:
 *  - xpService.grantXp()    — after every XP grant
 *  - xpService.removeXp()   — after every XP removal (demotion possible)
 *  - External scripts       — after season reset, bulk XP recalculation
 *
 * ARCHITECTURE:
 * - Recalculate is idempotent: calling it twice with the same XP has no effect
 * - Uses a Prisma transaction to atomically update UserExperience + UserLevelHistory
 * - All Prisma errors are propagated (no silent failures on promotions)
 */

import { prisma } from '../prisma.js';
import { eventBus } from '../events/index.js';
import { DomainEvent } from '../events/types.js';
import {
  RecalculateLevelParams,
  LevelRecalculationResult,
} from './types.js';
import { computeProgress } from './levelService.js';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate the level for a user based on their current totalXp.
 *
 * Steps:
 *  1. Read UserExperience (totalXp + currentLevel)
 *  2. Compute the correct level from totalXp via LevelService
 *  3. If the level changed, atomically update UserExperience + create UserLevelHistory
 *  4. Optionally emit USER_LEVEL_UP / USER_LEVEL_DOWN DomainEvent
 *
 * This function is idempotent — calling it when no level change occurred
 * is a no-op (no DB writes, no events).
 *
 * @returns LevelRecalculationResult with before/after state
 */
export async function recalculateLevel(
  params: RecalculateLevelParams,
): Promise<LevelRecalculationResult & { newLevelTitle?: string }> {
  const { organizationId, userId, emitEvents = false } = params;

  // 1. Read current state
  const userExp = await prisma.userExperience.findUnique({
    where: { userId },
    select: {
      id: true,
      totalXp: true,
      currentLevel: true,
    },
  });

  if (!userExp) {
    // User has no XP record yet — no recalculation needed
    return {
      userId,
      previousLevel: 1,
      newLevel: 1,
      levelChanged: false,
      promoted: false,
      demoted: false,
      xpAtCalculation: 0,
    };
  }

  const previousLevel = userExp.currentLevel;
  const totalXp = userExp.totalXp;

  // 2. Compute correct level from current XP
  const progress = await computeProgress(organizationId, totalXp);
  const newLevel = progress.currentLevel.level;

  // 3. No change — return early
  if (newLevel === previousLevel) {
    return {
      userId,
      previousLevel,
      newLevel,
      levelChanged: false,
      promoted: false,
      demoted: false,
      xpAtCalculation: totalXp,
    };
  }

  const promoted = newLevel > previousLevel;
  const newLevelTitle = progress.currentLevel.title;

  // 4. Atomically update UserExperience + create UserLevelHistory
  await prisma.$transaction(async (tx) => {
    // Update the cached level fields on UserExperience
    await tx.userExperience.update({
      where: { id: userExp.id },
      data: {
        currentLevel:   newLevel,
        currentLevelXp: progress.currentLevelXp,
        nextLevelXp:    progress.nextLevelXp,
      },
    });

    // Create an immutable UserLevelHistory record
    await tx.userLevelHistory.create({
      data: {
        organizationId,
        userId,
        userExperienceId: userExp.id,
        oldLevel: previousLevel,
        newLevel,
        xpAtPromotion: totalXp,
        metadata: {
          promoted,
          levelTitle: newLevelTitle,
          progressPercent: progress.progressPercent,
        },
      },
    });
  });

  // 5. Emit DomainEvents (fire-and-forget)
  if (emitEvents) {
    if (promoted) {
      eventBus.emit(DomainEvent.USER_LEVEL_UP, {
        eventId: `level_up_${userId}_${Date.now()}`,
        event: DomainEvent.USER_LEVEL_UP,
        organizationId,
        userId,
        resourceType: 'UserExperience',
        resourceId: userId,
        occurredAt: new Date(),
        metadata: { previousLevel, newLevel, newLevelTitle, xpAtPromotion: totalXp },
      });
    }
    // Future: emit USER_LEVEL_DOWN if we add a demoted-specific event
  }

  return {
    userId,
    previousLevel,
    newLevel,
    levelChanged: true,
    promoted,
    demoted: !promoted,
    xpAtCalculation: totalXp,
    newLevelTitle,
  };
}

/**
 * Bulk recalculate levels for all users in an organization.
 * Use after a season reset, XP curve change, or level definition update.
 *
 * Processes users in batches of 50 to avoid memory pressure.
 * Emits USER_LEVEL_UP for each promotion found.
 *
 * @param organizationId  Target organization
 * @param emitEvents      Whether to emit DomainEvents for each change
 * @returns Summary object with counts of promoted/demoted/unchanged users
 */
export async function bulkRecalculateLevels(
  organizationId: string,
  emitEvents = false,
): Promise<{ total: number; promoted: number; demoted: number; unchanged: number }> {
  const BATCH_SIZE = 50;
  let cursor: string | undefined;
  let total = 0;
  let promoted = 0;
  let demoted = 0;
  let unchanged = 0;

  while (true) {
    const batch = await prisma.userExperience.findMany({
      where: { organizationId },
      select: { userId: true },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { userId: cursor } } : {}),
      orderBy: { userId: 'asc' },
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      const result = await recalculateLevel({
        organizationId,
        userId: row.userId,
        emitEvents,
      });
      total++;
      if (result.promoted) promoted++;
      else if (result.demoted) demoted++;
      else unchanged++;
    }

    cursor = batch[batch.length - 1]!.userId;
    if (batch.length < BATCH_SIZE) break;
  }

  return { total, promoted, demoted, unchanged };
}
