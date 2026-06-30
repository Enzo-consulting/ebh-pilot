/**
 * cache/cacheFactory.ts — Cache Factory & Domain Singletons
 *
   * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PURPOSE:
 * Creates and exports named cache instances per domain namespace.
   * Each engine uses its own cache instance, isolated by namespace.
   *
   * USAGE:
 *   import { dashboardCache, leaderboardCache } from '../cache/index.js';
 *   await dashboardCache.set(`dashboard:${userId}`, data, { ttl: 300 });
 *
 * FUTURE:
 * To switch to Redis, change CacheFactory.create() to return new RedisCache()
   * All engines continue to work without modification.
 */

import { ICache } from './types.js';
  import { MemoryCache } from './memoryCache.js';
// import { RedisCache } from './redisCache.js'; // Uncomment when Redis is ready

// ─────────────────────────────────────────────────────────────────────────────
// CACHE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export type CacheDriver = 'memory' | 'redis';

/**
 * CacheFactory — Creates cache instances by driver type.
   *
   * To switch globally to Redis:
 * 1. Set CACHE_DRIVER=redis in environment
 * 2. CacheFactory.create() will return RedisCache
 * 3. All domain caches below automatically use Redis
 */
export class CacheFactory {
  /**
   * Create a cache instance based on the driver.
   * @param driver - 'memory' (default) or 'redis' (future)
   */
  static create(driver?: CacheDriver): ICache {
    const resolvedDriver: CacheDriver =
      driver ?? (process.env.CACHE_DRIVER as CacheDriver) ?? 'memory';

    switch (resolvedDriver) {
case 'redis':
        // Future: return new RedisCache({ host: process.env.REDIS_HOST, ... });
        // For now, fall through to memory (Redis stub throws on any call)
        console.warn('[CacheFactory] Redis not yet implemented — falling back to MemoryCache');
        return new MemoryCache();
case 'memory':
default:
        return new MemoryCache();
}
}
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CACHE SINGLETONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dashboard cache — stores computed dashboard data per user.
   * TTL: 60-300s recommended (real-time feel vs performance).
   */
export const dashboardCache: ICache = CacheFactory.create();

/**
 * Leaderboard cache — stores computed leaderboard rankings.
   * TTL: 60-600s recommended (rankings don't change every second).
 */
export const leaderboardCache: ICache = CacheFactory.create();

/**
 * Settings cache — stores tenant/organization settings.
   * TTL: 300-3600s recommended (settings rarely change).
 */
export const settingsCache: ICache = CacheFactory.create();

/**
 * Levels cache — stores level definitions and XP thresholds.
   * TTL: 3600s+ recommended (levels are near-static configuration).
 */
export const levelsCache: ICache = CacheFactory.create();

/**
 * Branding cache — stores white-label branding per organization.
   * TTL: 3600s recommended (branding changes are rare).
   */
export const brandingCache: ICache = CacheFactory.create();
