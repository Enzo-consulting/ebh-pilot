/**
 * cache/types.ts — Cache Interfaces & Types
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PURPOSE:
 * Defines the ICache interface and supporting types.
 * All cache implementations (Memory, Redis) must implement ICache.
 *
 * PHILOSOPHY:
 * - No business logic here — only types and interfaces
 * - ICache is the contract; implementations are swappable
 * - CacheNamespace isolates data between domains
 */

// ─────────────────────────────────────────────────────────────────────────────
// CACHE NAMESPACES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logical namespaces to isolate cache data by domain.
 * Each namespace has its own TTL policy and eviction strategy.
 */
export enum CacheNamespace {
    DASHBOARD = 'dashboard',
    LEADERBOARD = 'leaderboard',
    SETTINGS = 'settings',
    LEVELS = 'levels',
    BRANDING = 'branding',
    XP = 'xp',
    BADGES = 'badges',
    CHALLENGES = 'challenges',
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE ENTRY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal structure of a cached value.
 * Wraps the actual value with metadata for TTL management.
 */
export interface CacheEntry<T = unknown> {
    /** The cached value */
  value: T;
    /** Unix timestamp (ms) when this entry expires. 0 = never expires. */
  expiresAt: number;
    /** Unix timestamp (ms) when this entry was created */
  createdAt: number;
    /** Cache key for debugging */
  key: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHE OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for setting a cache entry.
 */
export interface CacheOptions {
    /** Time-to-live in seconds. Omit or 0 for no expiry. */
  ttl?: number;
    /** Custom tags for cache invalidation by group */
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ICACHE INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ICache — Universal Cache Interface
 *
 * Any cache implementation (Memory, Redis, Memcached) must implement this.
 * Business logic only depends on ICache — never on the concrete class.
 *
 * Usage:
 *   const cache: ICache = CacheFactory.create('redis');
 *   await cache.set('my-key', myValue, { ttl: 300 });
 *   const val = await cache.get<MyType>('my-key');
 */
export interface ICache {
    /**
     * Retrieve a cached value by key.
     * Returns null if not found or expired.
     */
  get<T = unknown>(key: string): Promise<T | null>;

  /**
     * Store a value in the cache.
     * @param key   - Cache key (must be unique within the namespace)
     * @param value - Value to cache (must be JSON-serializable)
     * @param opts  - Options: ttl (seconds), tags
     */
  set<T = unknown>(key: string, value: T, opts?: CacheOptions): Promise<void>;

  /**
     * Delete a specific cache entry.
     * No-op if the key does not exist.
     */
  delete(key: string): Promise<void>;

  /**
     * Check if a key exists and is not expired.
     */
  has(key: string): Promise<boolean>;

  /**
     * Delete all entries whose key matches the given prefix.
     * Useful for invalidating a whole group of related keys.
     */
  invalidateByPrefix(prefix: string): Promise<void>;

  /**
     * Delete all entries tagged with the given tag.
     * Requires tag support (tracked in CacheEntry).
     */
  invalidateByTag(tag: string): Promise<void>;

  /**
     * Clear all entries in this cache instance.
     */
  clear(): Promise<void>;

  /**
     * Return the number of non-expired entries.
     */
  size(): Promise<number>;

  /**
     * Return all keys (for debugging only — do not use in production paths).
     */
  keys(): Promise<string[]>;
}
