/**
 * profileService.ts — Public Profile Service
 *
 * Ticket 021D — Dashboard Engine & Public Profiles
 *
 * PURPOSE:
 * Reads and writes UserPublicProfile records.
 * Aggregates profile data from multiple engines into a single UserProfileDto.
 *
 * ARCHITECTURE RULES:
 * - This service NEVER mutates KPI, XP, badges, or reputation data
 * - It only reads from other engines (aggregation only)
 * - Profile visibility rules are enforced here (badgesVisible, statisticsVisible, etc.)
 * - profileViews counter is incremented via a separate lightweight call (recordProfileView)
 *
 * PREMIUM FEATURE:
 * "Who viewed my profile" is gated behind a feature flag.
 * The ProfileVisit records already exist (Ticket 020B).
 * This service provides the interface — premium gating is handled at route level.
 */

import { prisma } from '../prisma.js';
import type {
  UserProfileDto,
  BrandingConfig,
  PremiumProfileStatsDto,
  UpdateProfileParams,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the BrandingConfig for an organization.
 * Reads from OrganizationSetting keys (Ticket 019).
 * Falls back to sensible defaults if no branding is configured.
 */
async function resolveBranding(organizationId: string): Promise<BrandingConfig> {
  const settings = await prisma.organizationSetting.findMany({
    where: {
      organizationId,
      key: {
        in: [
          'branding_primary_color',
          'branding_secondary_color',
          'branding_accent_color',
          'branding_logo_url',
          'branding_favicon_url',
          'branding_font_family',
          'branding_app_name',
          'branding_level_label',
          'branding_xp_label',
          'branding_primary_kpi_unit',
        ],
      },
    },
    select: { key: true, value: true },
  });

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value as string]));

  return {
    organizationId,
    primaryColor:   s['branding_primary_color']    ?? '#6366F1',
    secondaryColor: s['branding_secondary_color']  ?? '#818CF8',
    accentColor:    s['branding_accent_color']     ?? '#F59E0B',
    logoUrl:        s['branding_logo_url']         ?? null,
    faviconUrl:     s['branding_favicon_url']      ?? null,
    fontFamily:     s['branding_font_family']      ?? null,
    appName:        s['branding_app_name']         ?? 'EBH-Pilot',
    levelLabel:     s['branding_level_label']      ?? 'Niveau',
    xpLabel:        s['branding_xp_label']         ?? 'XP',
    primaryKpiUnit: s['branding_primary_kpi_unit'] ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full public profile for a user, enriched with data from all engines.
 *
 * Data sources aggregated:
 * - UserPublicProfile (base profile data)
 * - UserExperience (level, XP — Ticket 021C)
 * - UserReputationIndex (reputation score — Ticket 020B)
 * - UserBadge + Badge (badges — Ticket 020)
 * - LeaderboardEntry (current rank — Ticket 021B)
 * - OrganizationSetting (branding — Ticket 019)
 *
 * @returns UserProfileDto or null if profile is not visible/does not exist
 */
export async function getUserProfile(
  organizationId: string,
  userId: string,
  viewerUserId?: string,
): Promise<UserProfileDto | null> {
  // 1. Load base profile
  const profile = await prisma.userPublicProfile.findUnique({
    where: { userId },
    select: {
      userId: true,
      organizationId: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      coverImageUrl: true,
      jobTitle: true,
      joinedAt: true,
      customLinks: true,
      highlightedBadges: true,
      visibility: true,
      isVisible: true,
      isPublicInsideOrganization: true,
      badgesVisible: true,
      achievementsVisible: true,
      statisticsVisible: true,
      profileViews: true,
      lastProfileView: true,
      currentRank: true,
      reputationScore: true,
      totalSales: true,
      totalClients: true,
      totalProspects: true,
      level: true,
      lifetimeXp: true,
      totalXp: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!profile || !profile.isVisible) return null;

  // 2. Enforce visibility scope (ORGANIZATION vs PUBLIC etc.)
  if (profile.organizationId !== organizationId) return null;

  // 3. Load XP / level from UserExperience (most up-to-date source)
  const userExp = await prisma.userExperience.findUnique({
    where: { userId },
    select: { currentLevel: true, lifetimeXp: true, totalXp: true, currentLevelXp: true, nextLevelXp: true },
  });

  const currentLevel = userExp?.currentLevel ?? profile.level;
  const lifetimeXp   = userExp?.lifetimeXp   ?? profile.lifetimeXp;

  // 4. Resolve level title / icon / color from LevelDefinition
  const levelDef = await prisma.levelDefinition.findFirst({
    where: {
      OR: [{ organizationId }, { isDefault: true }],
      level: currentLevel,
    },
    orderBy: { organizationId: 'asc' }, // org-specific first
    select: { title: true, icon: true, color: true },
  });

  // 5. Load reputation score
  const repIndex = await prisma.userReputationIndex.findUnique({
    where: { userId },
    select: { globalScore: true, percentile: true, rankInOrganization: true },
  });

  // 6. Load badges (only if visible)
  let badges: UserProfileDto['badges'] = [];
  if (profile.badgesVisible) {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
      take: 10,
      select: {
        badge: { select: { id: true, name: true, icon: true, color: true, rarity: true } },
        earnedAt: true,
      },
    });
    badges = userBadges.map((ub) => ({
      badgeId: ub.badge.id,
      name: ub.badge.name,
      icon: ub.badge.icon,
      color: ub.badge.color,
      rarity: ub.badge.rarity,
      earnedAt: ub.earnedAt,
    }));
  }

  // 7. Resolve branding
  const branding = await resolveBranding(organizationId);

  return {
    userId: profile.userId,
    organizationId: profile.organizationId,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    coverImageUrl: profile.coverImageUrl,
    jobTitle: profile.jobTitle,
    joinedAt: profile.joinedAt,
    currentLevel,
    levelTitle: levelDef?.title ?? `Niveau ${currentLevel}`,
    levelIcon: levelDef?.icon ?? null,
    levelColor: levelDef?.color ?? null,
    lifetimeXp,
    currentRank: profile.currentRank,
    reputationScore: repIndex?.globalScore ? Number(repIndex.globalScore) : null,
    totalSales: profile.statisticsVisible ? profile.totalSales : 0,
    totalClients: profile.statisticsVisible ? profile.totalClients : 0,
    totalProspects: profile.statisticsVisible ? profile.totalProspects : 0,
    profileViews: profile.profileViews,
    lastProfileView: profile.lastProfileView,
    isPublicInsideOrganization: profile.isPublicInsideOrganization,
    badgesVisible: profile.badgesVisible,
    achievementsVisible: profile.achievementsVisible,
    statisticsVisible: profile.statisticsVisible,
    badges,
    customLinks: (profile.customLinks as Array<{ label: string; url: string }>) ?? [],
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    branding,
  };
}

/**
 * Upsert (create or update) the public profile for a user.
 * Only updates fields explicitly provided in params.
 */
export async function updateProfile(params: UpdateProfileParams): Promise<void> {
  const { organizationId, userId, ...fields } = params;

  await prisma.userPublicProfile.upsert({
    where: { userId },
    create: {
      userId,
      organizationId,
      ...fields,
      customLinks: fields.customLinks ? (fields.customLinks as any) : [],
    },
    update: {
      ...(fields.displayName !== undefined && { displayName: fields.displayName }),
      ...(fields.bio !== undefined && { bio: fields.bio }),
      ...(fields.avatarUrl !== undefined && { avatarUrl: fields.avatarUrl }),
      ...(fields.coverImageUrl !== undefined && { coverImageUrl: fields.coverImageUrl }),
      ...(fields.jobTitle !== undefined && { jobTitle: fields.jobTitle }),
      ...(fields.badgesVisible !== undefined && { badgesVisible: fields.badgesVisible }),
      ...(fields.achievementsVisible !== undefined && { achievementsVisible: fields.achievementsVisible }),
      ...(fields.statisticsVisible !== undefined && { statisticsVisible: fields.statisticsVisible }),
      ...(fields.isPublicInsideOrganization !== undefined && { isPublicInsideOrganization: fields.isPublicInsideOrganization }),
      ...(fields.customLinks !== undefined && { customLinks: fields.customLinks as any }),
    },
  });
}

/**
 * Record a profile view event (lightweight, increments counter).
 * Skips self-views.
 * Inserts a ProfileVisit record (for the "Who viewed my profile?" premium feature).
 *
 * NOTE: This should be called asynchronously (fire-and-forget) to avoid
 * blocking the profile load response.
 */
export async function recordProfileView(
  organizationId: string,
  profileUserId: string,
  visitorUserId?: string,
): Promise<void> {
  // Skip self-views
  if (visitorUserId && visitorUserId === profileUserId) return;

  // Find the profile record
  const profile = await prisma.userPublicProfile.findUnique({
    where: { userId: profileUserId },
    select: { id: true },
  });
  if (!profile) return;

  // Increment counter and update lastProfileView
  await prisma.userPublicProfile.update({
    where: { userId: profileUserId },
    data: {
      profileViews: { increment: 1 },
      lastProfileView: new Date(),
    },
  });

  // Insert ProfileVisit record for premium "who viewed" feature
  await prisma.profileVisit.create({
    data: {
      organizationId,
      visitorId: visitorUserId ?? null,
      profileId: profile.id,
    },
  });
}

/**
 * Get premium profile viewer data (gated behind feature flag at route level).
 * Returns null if the feature is disabled for this organization.
 */
export async function getProfileViewers(
  organizationId: string,
  profileUserId: string,
  limit = 20,
): Promise<PremiumProfileStatsDto> {
  const profile = await prisma.userPublicProfile.findUnique({
    where: { userId: profileUserId },
    select: { id: true, profileViews: true },
  });

  if (!profile) {
    return {
      profileViewers: null,
      popularityScore: null,
      influenceScore: null,
      followerCount: null,
      mentionCount: null,
      engagementScore: null,
    };
  }

  // Check if premium feature is enabled for this org (Ticket 019)
  const config = await prisma.profileVisitConfig.findUnique({
    where: { organizationId },
    select: { isEnabled: true, isPremiumOnly: true },
  });

  if (!config?.isEnabled) {
    return {
      profileViewers: null,
      popularityScore: null,
      influenceScore: null,
      followerCount: null,
      mentionCount: null,
      engagementScore: null,
    };
  }

  // Load recent profile visits
  const visits = await prisma.profileVisit.findMany({
    where: { profileId: profile.id },
    orderBy: { visitedAt: 'desc' },
    take: limit,
    select: {
      visitorId: true,
      visitedAt: true,
      visitor: { select: { name: true, publicProfile: { select: { avatarUrl: true } } } },
    },
  });

  const viewers = visits.map((v) => ({
    userId: v.visitorId ?? 'anonymous',
    userName: v.visitor?.name ?? null,
    avatarUrl: v.visitor?.publicProfile?.avatarUrl ?? null,
    viewedAt: v.visitedAt,
  }));

  // Popularity score = normalized view count (simple placeholder formula)
  const popularityScore = Math.min(100, Math.round(profile.profileViews / 10));

  return {
    profileViewers: viewers,
    popularityScore,
    influenceScore: null,  // Future: computed from rank + XP + badges
    followerCount: null,   // Future: follower system
    mentionCount: null,    // Future: mention system
    engagementScore: null, // Future: engagement algorithm
  };
}

// Re-export branding resolver for use by other services
export { resolveBranding };
