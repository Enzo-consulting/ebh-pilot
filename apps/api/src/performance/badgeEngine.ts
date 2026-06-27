/**
 * badgeEngine.ts — Badge & Gamification Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * Manages badge detection, awarding, and XP accumulation.
 *
 * GAMIFICATION ELEMENTS:
 *   Badges       — visual rewards for achievements
 *   XP           — experience points accumulated from badges
 *   Levels       — derived from total XP (future: Level model)
 *   Streaks      — consecutive activity tracking (future: Streak model)
 *   Rarities     — COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
 *   Titles       — earned at milestones (future)
 *
 * TRIGGER TYPES:
 *   KPI_THRESHOLD    — KPI value crosses a threshold
 *   LEADERBOARD_RANK — User reaches a top position
 *   STREAK           — Consecutive days/weeks of activity
 *   CHALLENGE_WIN    — Winning a challenge
 *   GOAL_REACHED     — Completing a personal goal
 *   FIRST_TIME       — First occurrence of an event
 *   MANUAL           — Admin-granted badge
 *   SEASONAL         — Seasonal badge (winter, summer, ...)
 *   LEVEL_UP         — Reaching a new level
 *   ANNIVERSARY      — Platform anniversary
 *
 * MOBILE SUPPORT:
 *   Badge unlock animations triggered via DomainEvent NOTIFICATION_CREATED
 *   Push notification sent via NotificationListener
 *
 * PRIVACY:
 *   isPublic = false → badge visible only to the user and their manager
 *   All badge queries are scoped to organizationId
 */

import prisma from '../prisma.js';
import type { BadgeEvaluationResult } from './performanceEngine.js';

/**
 * Evaluate all badges that could be triggered by a KPI value change.
 *
 * Called by performanceEngine.recordKpiValue() after each KPI record.
 * Checks all active KPI_THRESHOLD badges for the organization.
 * Awards badges that have not been awarded yet (or repeatable ones).
 *
 * @param userId         - The user to evaluate
 * @param organizationId - Multi-tenant scope
 * @param kpiCode        - The KPI that was just updated
 * @param newValue       - The new cumulative KPI value
 */
export async function evaluateBadges(
  userId: string,
  organizationId: string,
  kpiCode: string,
  newValue: number
): Promise<BadgeEvaluationResult> {
  // TODO: implement badge evaluation logic
  // Steps:
  // 1. Load all active KPI_THRESHOLD badges for this organization and kpiCode
  // 2. For each badge: check if triggerConfig.kpiCode matches and threshold is crossed
  // 3. Check if user already has this badge (and badge is not repeatable)
  // 4. If eligible: call awardBadge(userId, badge.id, context)
  // 5. Return list of awarded badge codes + total XP earned
  console.log(`[BadgeEngine] evaluateBadges() for user ${userId}, kpi ${kpiCode}, value ${newValue}`);
  return { badgesAwarded: [], xpEarned: 0 };
}

/**
 * Award a badge to a user.
 *
 * Creates a UserBadge record and emits a NOTIFICATION_CREATED event
 * so the mobile app can show an unlock animation.
 *
 * If the badge is not repeatable and the user already has it, does nothing.
 *
 * @param userId    - The user receiving the badge
 * @param badgeId   - The badge definition ID
 * @param context   - Optional context (KPI value, position, etc.)
 */
export async function awardBadge(
  userId: string,
  badgeId: string,
  context?: Record<string, unknown>
): Promise<boolean> {
  try {
    const badge = await (prisma as any).badge.findUnique({
      where:  { id: badgeId },
      select: { isRepeatable: true, xpReward: true, name: true },
    });

    if (!badge) return false;

    // Check if user already has this badge (for non-repeatable badges)
    if (!badge.isRepeatable) {
      const existing = await (prisma as any).userBadge.findFirst({
        where: { userId, badgeId },
      });
      if (existing) return false;
    }

    await (prisma as any).userBadge.create({
      data: {
        userId,
        badgeId,
        earnedAt:   new Date(),
        context:    context ?? {},
        isNotified: false,
      },
    });

    // TODO: emit NOTIFICATION_CREATED DomainEvent with badge info
    // TODO: accumulate XP on user (future UserProfile model)

    console.log(`[BadgeEngine] Badge "${badge.name}" awarded to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[BadgeEngine] awardBadge error: ${error}`);
    return false;
  }
}

/**
 * Get all badges earned by a user.
 *
 * Used for:
 * - Profile badge wall (web)
 * - Mobile profile screen
 * - "Achievements" section
 * - RGPD data export
 *
 * @param organizationId - Multi-tenant scope
 * @param userId         - The user
 */
export async function getUserBadges(
  organizationId: string,
  userId: string
): Promise<Array<{
  badgeId:     string;
  code:        string;
  name:        string;
  icon:        string | null;
  rarity:      string;
  xpReward:    number;
  earnedAt:    Date;
  isPublic:    boolean;
}>> {
  try {
    const userBadges = await (prisma as any).userBadge.findMany({
      where: {
        userId,
        badge: { organizationId, isActive: true },
      },
      include: {
        badge: {
          select: {
            id: true, code: true, name: true,
            icon: true, rarity: true, xpReward: true, isPublic: true,
          },
        },
      },
      orderBy: { earnedAt: 'desc' },
    });

    return userBadges.map((ub: any) => ({
      badgeId:  ub.badge.id,
      code:     ub.badge.code,
      name:     ub.badge.name,
      icon:     ub.badge.icon,
      rarity:   ub.badge.rarity,
      xpReward: ub.badge.xpReward,
      earnedAt: ub.earnedAt,
      isPublic: ub.badge.isPublic,
    }));
  } catch (error) {
    console.error(`[BadgeEngine] getUserBadges error: ${error}`);
    return [];
  }
}

/**
 * Get all badge definitions for an organization.
 *
 * Used for:
 * - Badge catalog page ("Badges to unlock")
 * - Admin badge management
 * - Mobile badge discovery screen
 *
 * @param organizationId - Multi-tenant scope
 */
export async function getBadgeDefinitions(
  organizationId: string
): Promise<Array<{
  id:          string;
  code:        string;
  name:        string;
  description: string | null;
  icon:        string | null;
  rarity:      string;
  xpReward:    number;
  isRepeatable: boolean;
}>> {
  try {
    return (prisma as any).badge.findMany({
      where:   { organizationId, isActive: true },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
      select: {
        id: true, code: true, name: true, description: true,
        icon: true, rarity: true, xpReward: true, isRepeatable: true,
      },
    });
  } catch (error) {
    console.error(`[BadgeEngine] getBadgeDefinitions error: ${error}`);
    return [];
  }
}
