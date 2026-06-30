/**
 * cache/index.ts — Cache Abstraction Layer
  *
   * Ticket 022 — Integration Engine & Domain Hooks
    *
     * PURPOSE:
      * Provides cache interfaces and implementations for the Integration Engine.
       * Currently uses in-memory cache. Redis implementation is stubbed for future use.
        *
         * PHILOSOPHY:
          * - Program against ICache interface, never against implementations
           * - Swap MemoryCache for RedisCache without touching business logic
            * - Each cache namespace is independent (dashboard, leaderboard, settings, etc.)
             *
              * FUTURE:
               * Replace MemoryCache with RedisCache by updating CacheFactory.create()
                * No hook, engine, or service needs to change.
                 */

                 export { ICache, CacheEntry, CacheOptions, CacheNamespace } from './types.js';
                 export { MemoryCache } from './memoryCache.js';
                 export { RedisCache } from './redisCache.js';
                 export { CacheFactory, dashboardCache, leaderboardCache, settingsCache, levelsCache, brandingCache } from './cacheFactory.js';
                 
