/**
 * challengeEngine.ts — Challenge Engine
 *
 * Ticket 020 — Performance Engine (KPI, Leaderboards & Gamification)
 *
 * Manages challenge lifecycle: join, score, rank, reward.
 *
 * CHALLENGE TYPES:
 *   INDIVIDUAL  — Each participant competes against others
 *   TEAM        — Teams compete (teams defined via BusinessUnit / custom grouping)
 *   COOPERATIVE — All participants work together toward a shared target
 *   PERSONAL    — User competes against their own past performance
 *
 * CHALLENGE LIFECYCLE:
 *   DRAFT → SCHEDULED → ACTIVE → COMPLETED / CANCELLED
 *   Admin transitions: ACTIVE → PAUSED → ACTIVE
 *
 * MOBILE SUPPORT:
 *   Active challenges → widget on mobile dashboard
 *   Challenge start/end → push notifications
 *   Real-time score updates → WebSocket (future)
 *   Challenge completion → badge + reward animation
 *
 * PREMIUM FEATURES:
 *   Private challenges (invite-only)
 *   Private leagues (recurring challenges)
 *   Custom rewards with images
 *   Challenge analytics
 */

import prisma from '../prisma.js';
import type { ChallengeResult } from './performanceEngine.js';

/**
 * Get all active challenges for an organization.
 *
 * @param organizationId - Multi-tenant scope
 * @param userId         - Optional: filter to challenges the user is enrolled in
 */
export async function getActiveChallenges(
  organizationId: string,
  userId?: string
): Promise<ChallengeResult[]> {
  try {
    const now = new Date();
    const where: Record<string, unknown> = {
      organizationId,
      status:    'ACTIVE',
      startDate: { lte: now },
      endDate:   { gte: now },
    };

    if (userId) {
      where.participants = { some: { userId } };
    }

    const challenges = await (prisma as any).challenge.findMany({
      where,
      include: { _count: { select: { participants: true } } },
      orderBy: { endDate: 'asc' },
    });

    return challenges.map((c: any) => ({
      id:           c.id,
      name:         c.name,
      status:       c.status,
      type:         c.type,
      kpiCode:      c.kpiCode,
      targetValue:  c.targetValue ? Number(c.targetValue) : null,
      startDate:    c.startDate,
      endDate:      c.endDate,
      participants: c._count.participants,
    }));
  } catch (error) {
    console.error(`[ChallengeEngine] getActiveChallenges error: ${error}`);
    return [];
  }
}

/**
 * Get the leaderboard of a specific challenge.
 *
 * @param organizationId - Multi-tenant scope
 * @param challengeId    - The challenge
 */
export async function getChallengeLeaderboard(
  organizationId: string,
  challengeId: string
): Promise<Array<{ position: number; userId: string; userName: string | null; score: number }>> {
  try {
    const challenge = await (prisma as any).challenge.findFirst({
      where: { id: challengeId, organizationId },
      select: { id: true },
    });
    if (!challenge) return [];

    const participants = await (prisma as any).challengeParticipant.findMany({
      where:   { challengeId },
      orderBy: { score: 'desc' },
      include: { user: { select: { name: true } } },
    });

    return participants.map((p: any, index: number) => ({
      position: index + 1,
      userId:   p.userId,
      userName: p.user?.name ?? null,
      score:    Number(p.score),
    }));
  } catch (error) {
    console.error(`[ChallengeEngine] getChallengeLeaderboard error: ${error}`);
    return [];
  }
}

/**
 * Update a participant's score in a challenge.
 *
 * Called by performanceEngine after a KPI value is recorded.
 * Updates score and recomputes position.
 *
 * @param userId         - The participant
 * @param organizationId - Multi-tenant scope
 * @param kpiCode        - The KPI that was updated
 * @param delta          - The change in value (positive or negative)
 */
export async function updateChallengeScore(
  userId: string,
  organizationId: string,
  kpiCode: string,
  delta: number
): Promise<void> {
  // TODO: implement challenge score update
  // Steps:
  // 1. Find all ACTIVE challenges for this org that track this kpiCode
  // 2. For each challenge where user is a participant:
  //    a. Increment participant.score by delta
  //    b. Recompute positions for all participants
  //    c. Update ChallengeParticipant.position for all
  // 3. If a COOPERATIVE challenge target is reached: trigger completion
  console.log(`[ChallengeEngine] updateChallengeScore() for user ${userId}, kpi ${kpiCode}`);
}

/**
 * Join a challenge (register as participant).
 *
 * @param userId         - The user joining
 * @param organizationId - Multi-tenant scope
 * @param challengeId    - The challenge to join
 */
export async function joinChallenge(
  userId: string,
  organizationId: string,
  challengeId: string
): Promise<boolean> {
  try {
    const challenge = await (prisma as any).challenge.findFirst({
      where: { id: challengeId, organizationId, status: 'ACTIVE' },
      select: { id: true, maxParticipants: true, _count: { select: { participants: true } } },
    });

    if (!challenge) return false;

    // Check max participants
    if (challenge.maxParticipants && challenge._count.participants >= challenge.maxParticipants) {
      console.warn(`[ChallengeEngine] Challenge ${challengeId} is full.`);
      return false;
    }

    await (prisma as any).challengeParticipant.upsert({
      where:  { challengeId_userId: { challengeId, userId } },
      create: { challengeId, userId, score: 0, joinedAt: new Date() },
      update: {},
    });

    return true;
  } catch (error) {
    console.error(`[ChallengeEngine] joinChallenge error: ${error}`);
    return false;
  }
}
