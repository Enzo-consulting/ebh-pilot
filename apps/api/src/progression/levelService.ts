/**
 * levelService.ts — Level Resolution & Progress Service
 *
 * Ticket 021C — XP Engine & Progression
 *
 * PURPOSE:
 * Resolves level definitions and computes XP progress metrics.
 * This service is READ-ONLY — it never mutates XP or writes level history.
 * All mutations are handled by xpService and promotionService.
 *
 * LEVEL RESOLUTION STRATEGY:
 * 1. Look for org-specific LevelDefinition records (organizationId = given org)
 * 2. If none found, fall back to system defaults (isDefault = true)
 * 3. System defaults are seeded from SYSTEM_LEVELS in types.ts
 *
 * WHITE LABEL SUPPORT (Ticket 014C):
 * Every organization can define its own level ladder with custom:
 *  - titles (e.g., "Agent" → "Directeur")
 *  - icons  (emoji, URL or icon name)
 *  - colors (per White Label design system)
 *  - rewards (JSON blob delivered to the notification / reward engine)
 *
 * PERFORMANCE:
 * Level definitions are rarely updated (cache-friendly).
 * Future: add an in-memory TTL cache (5 min) to avoid repeated DB queries
 * in high-traffic scenarios.
 */

import { prisma } from '../prisma.js';
import {
  ResolvedLevel,
  NextRewardPreview,
  SYSTEM_LEVELS,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// CORE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all level definitions for an organization, ordered by level ascending.
 *
 * Resolution order:
 *  1. Org-specific definitions (organizationId = given org)
 *  2. System defaults (isDefault = true, organizationId = null)
 *
 * @returns Ordered array of ResolvedLevel from level 1 to max
 */
export async function getLevelDefinitions(
  organizationId: string,
): Promise<ResolvedLevel[]> {
  // Try org-specific first
  const orgLevels = await prisma.levelDefinition.findMany({
    where: { organizationId },
    orderBy: { level: 'asc' },
  });

  if (orgLevels.length > 0) {
    return orgLevels.map((l) => ({
      level: l.level,
      title: l.title,
      minXp: l.minXp,
      icon: l.icon,
      color: l.color,
      rewardJson: (l.rewardJson as Record<string, unknown>) ?? {},
    }));
  }

  // Fall back to system defaults
  const systemLevels = await prisma.levelDefinition.findMany({
    where: { isDefault: true, organizationId: null },
    orderBy: { level: 'asc' },
  });

  if (systemLevels.length > 0) {
    return systemLevels.map((l) => ({
      level: l.level,
      title: l.title,
      minXp: l.minXp,
      icon: l.icon,
      color: l.color,
      rewardJson: (l.rewardJson as Record<string, unknown>) ?? {},
    }));
  }

  // Last resort: in-memory SYSTEM_LEVELS (before DB seed runs)
  return SYSTEM_LEVELS.map((l) => ({
    level: l.level,
    title: l.title,
    minXp: l.minXp,
    icon: l.icon,
    color: l.color,
    rewardJson: {},
  }));
}

/**
 * Resolve a single level definition by level number.
 * Returns null if the level number exceeds the maximum defined level.
 */
export async function resolveLevel(
  organizationId: string,
  level: number,
): Promise<ResolvedLevel | null> {
  const levels = await getLevelDefinitions(organizationId);
  return levels.find((l) => l.level === level) ?? null;
}

/**
 * Determine which level a given XP total corresponds to.
 *
 * Algorithm: finds the highest level whose minXp <= totalXp.
 * Returns level 1 if totalXp < first threshold (should always be 0).
 */
export async function getCurrentLevel(
  organizationId: string,
  totalXp: number,
): Promise<ResolvedLevel> {
  const levels = await getLevelDefinitions(organizationId);

  // Walk from highest to lowest level, find first level with minXp <= totalXp
  for (let i = levels.length - 1; i >= 0; i--) {
    const lvl = levels[i]!;
    if (totalXp >= lvl.minXp) {
      return lvl;
    }
  }

  // Fallback: always at least level 1
  return levels[0] ?? {
    level: 1,
    title: 'Recrue',
    minXp: 0,
    icon: '🌱',
    color: '#94A3B8',
    rewardJson: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute XP progress metrics for a given total XP.
 * Returns current level XP (within the level), next level XP threshold,
 * progress percentage and remaining XP.
 */
export async function computeProgress(
  organizationId: string,
  totalXp: number,
): Promise<{
  currentLevel: ResolvedLevel;
  nextLevel: ResolvedLevel | null;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  remainingXp: number;
}> {
  const levels = await getLevelDefinitions(organizationId);
  const currentLevel = await getCurrentLevel(organizationId, totalXp);
  const nextLevelDef = levels.find((l) => l.level === currentLevel.level + 1) ?? null;

  const currentLevelXp = totalXp - currentLevel.minXp;
  const nextLevelXp = nextLevelDef
    ? nextLevelDef.minXp - currentLevel.minXp
    : 0;

  const progressPercent = nextLevelXp > 0
    ? Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100))
    : 100;

  const remainingXp = nextLevelDef
    ? Math.max(0, nextLevelDef.minXp - totalXp)
    : 0;

  return {
    currentLevel,
    nextLevel: nextLevelDef,
    currentLevelXp,
    nextLevelXp,
    progressPercent,
    remainingXp,
  };
}

/**
 * Compute the progress percentage (0–100) for a user based on their current XP.
 * Convenience wrapper around computeProgress().
 */
export async function getProgressPercentage(
  organizationId: string,
  totalXp: number,
): Promise<number> {
  const { progressPercent } = await computeProgress(organizationId, totalXp);
  return progressPercent;
}

// ─────────────────────────────────────────────────────────────────────────────
// REWARD PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a preview of the next reward to be unlocked by a user.
 * The "next reward" is the reward defined on the next level that has
 * a non-empty rewardJson.
 *
 * Returns null if the user is at the maximum level or no reward is defined.
 */
export async function getNextReward(
  organizationId: string,
  totalXp: number,
): Promise<NextRewardPreview | null> {
  const levels = await getLevelDefinitions(organizationId);
  const current = await getCurrentLevel(organizationId, totalXp);

  // Search future levels for the first one with a reward
  for (let i = 0; i < levels.length; i++) {
    const lvl = levels[i]!;
    if (lvl.level <= current.level) continue;

    const hasReward =
      lvl.rewardJson &&
      typeof lvl.rewardJson === 'object' &&
      Object.keys(lvl.rewardJson).length > 0;

    if (hasReward) {
      return {
        level: lvl.level,
        title: lvl.title,
        icon: lvl.icon,
        color: lvl.color,
        xpRequired: lvl.minXp,
        remainingXp: Math.max(0, lvl.minXp - totalXp),
        rewardJson: lvl.rewardJson as Record<string, unknown>,
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM LEVEL SEEDING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Seed the default system level definitions.
 * Should be called once at application startup (or via migration script).
 * Uses upsert to be idempotent.
 *
 * Organizations that have not customized their levels will automatically
 * use these system defaults.
 */
export async function seedSystemLevels(): Promise<void> {
  for (const lvl of SYSTEM_LEVELS) {
    await prisma.levelDefinition.upsert({
      where: {
        organizationId_level: {
          organizationId: null as any,
          level: lvl.level,
        },
      },
      update: {
        title: lvl.title,
        minXp: lvl.minXp,
        icon: lvl.icon,
        color: lvl.color,
        isDefault: true,
      },
      create: {
        organizationId: null,
        level: lvl.level,
        title: lvl.title,
        minXp: lvl.minXp,
        icon: lvl.icon,
        color: lvl.color,
        isDefault: true,
        rewardJson: {},
      },
    });
  }
}
