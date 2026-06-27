/**
 * goalEngine.ts — Goal Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * Manages individual and team objective tracking.
 *
 * GOAL PERIODS: DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM
 * GOAL STATUS:  ACTIVE, COMPLETED, FAILED, CANCELLED, PAUSED
 *
 * PROGRESSION:
 * - GoalProgress snapshots are recorded at each KPI update
 * - progressPct = (currentValue / targetValue) * 100
 * - projection = extrapolation of final value based on current rate
 *
 * MOBILE SUPPORT:
 * - Progress bars in mobile widgets
 * - Daily progress notifications
 * - Completion celebrations (animation + badge)
 * - Goal creation from mobile app
 *
 * PREMIUM FEATURES:
 * - Historical goal performance
 * - Goal template library
 * - Manager-set goals for team members
 * - Goal comparison between team members
 */

import prisma from '../prisma.js';
import type { GoalResult, GoalProgressResult } from './performanceEngine.js';

/**
 * Get all active goals for a user.
 *
 * @param organizationId - Multi-tenant scope
 * @param userId         - The user
 */
export async function getUserGoals(
  organizationId: string,
  userId: string
): Promise<GoalResult[]> {
  try {
    const goals = await (prisma as any).goal.findMany({
      where:   { userId, organizationId, status: 'ACTIVE' },
      orderBy: { endDate: 'asc' },
    });

    return goals.map((g: any) => ({
      id:          g.id,
      kpiCode:     g.kpiCode,
      name:        g.name,
      targetValue: Number(g.targetValue),
      period:      g.period,
      startDate:   g.startDate,
      endDate:     g.endDate,
      status:      g.status,
    }));
  } catch (error) {
    console.error(`[GoalEngine] getUserGoals error: ${error}`);
    return [];
  }
}

/**
 * Get the latest progress snapshot for a goal.
 *
 * @param goalId - The goal ID
 */
export async function getGoalProgress(goalId: string): Promise<GoalProgressResult | null> {
  try {
    const progress = await (prisma as any).goalProgress.findFirst({
      where:   { goalId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!progress) return null;

    return {
      currentValue: Number(progress.currentValue),
      progressPct:  Number(progress.progressPct),
      projection:   progress.projection ? Number(progress.projection) : null,
      recordedAt:   progress.recordedAt,
    };
  } catch (error) {
    console.error(`[GoalEngine] getGoalProgress error: ${error}`);
    return null;
  }
}

/**
 * Update goal progress after a KPI value change.
 *
 * Called by performanceEngine.recordKpiValue().
 * Records a new GoalProgress snapshot and updates goal status if completed.
 *
 * @param userId         - The user
 * @param organizationId - Multi-tenant scope
 * @param kpiCode        - The KPI that changed
 */
export async function updateGoalProgress(
  userId: string,
  organizationId: string,
  kpiCode: string
): Promise<void> {
  // TODO: implement goal progress update
  // Steps:
  // 1. Find all ACTIVE goals for this user + kpiCode
  // 2. Compute new currentValue by summing UserKpiValue in the goal period
  // 3. Compute progressPct = (currentValue / targetValue) * 100
  // 4. Compute projection (linear extrapolation based on elapsed time)
  // 5. Record GoalProgress snapshot
  // 6. If progressPct >= 100: mark goal as COMPLETED, trigger badge evaluation
  // 7. If endDate < now and progressPct < 100: mark goal as FAILED
  console.log(`[GoalEngine] updateGoalProgress() for user ${userId}, kpi ${kpiCode}`);
}

/**
 * Check if a goal is completed and trigger the appropriate actions.
 *
 * @param goalId - The goal to check
 */
export async function checkGoalCompletion(goalId: string): Promise<boolean> {
  // TODO: implement goal completion check
  // Steps:
  // 1. Load goal + latest GoalProgress
  // 2. If progressPct >= 100 and status = ACTIVE:
  //    a. Update goal.status = COMPLETED
  //    b. Award GOAL_REACHED badge via badgeEngine.evaluateBadges()
  //    c. Emit NOTIFICATION_CREATED event (congratulations)
  //    d. Emit TASK_COMPLETED DomainEvent for audit trail
  // 3. Return true if just completed, false if already completed or not yet
  console.log(`[GoalEngine] checkGoalCompletion() for goal ${goalId}`);
  return false;
}
