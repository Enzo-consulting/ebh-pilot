/**
 * cache/redisCache.ts — Redis Cache Stub
 *
 * Ticket 022 — Integration Engine & Domain Hooks
 *
 * PURPOSE:
 * Stub implementation of ICache for Redis.
 * Not yet implemented — placeholder for future Ticket (Redis integration).
 *
 * WHEN TO IMPLEMENT:
 * - When deploying to multi-instance environments
 * - When MemoryCache is insufficient (cache not shared between processes)
 * - Install: npm install ioredis
 * - Uncomment the Redis logic below and remove the stub errors
 *
 * USAGE (future):
 *   const cache: ICache = new RedisCache({ host: 'localhost', port: 6379 });
 *
 * IMPORTANT:
 * This file intentionally contains NO Redis imports.
 * Adding `import Redis from 'ioredis'` would require the package to be installed.
 * The stub throws NotImplementedError to make misconfiguration obvious at runtime.
 */

import { ICache, CacheOptions } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CACHE OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface RedisCacheOptions {
    /** Redis host (default: 'localhost') */
    host?: string;
    /** Redis port (default: 6379) */
    port?: number;
    /** Redis password */
    password?: string;
    /** Redis database index (default: 0) */
    db?: number;
    /** Key prefix for namespace isolation (e.g. 'ebh:') */
    keyPrefix?: string;
  }

// ─────────────────────────────────────────────────────────────────────────────
// REDIS CACHE — STUB IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RedisCache — Stub (not yet implemented)
 *
 * Implements ICache interface. All methods throw NotImplementedError.
 * Replace stub bodies with actual Redis calls when ready.
 *
 * To activate:
 * 1. npm install ioredis
 * 2. Replace stub bodies with: this.client.get / set / del / etc.
 * 3. Update CacheFactory to use RedisCache when REDIS_URL is set
 */
export class RedisCache implements ICache {
    private readonly opts: RedisCacheOptions;

    constructor(opts: RedisCacheOptions = {}) {
          this.opts = {
                  host: opts.host ?? 'localhost',
                  port: opts.port ?? 6379,
                  password: opts.password,
                  db: opts.db ?? 0,
                  keyPrefix: opts.keyPrefix ?? 'ebh:',
                };
          // Future: this.client = new Redis(this.opts);
        }

    private notImplemented(method: string): never {
          throw new Error(
                  `RedisCache.${method}() is not yet implemented. ` +
                  `Use MemoryCache for now, or implement Redis integration. ` +
                  `See cache/redisCache.ts for instructions.`
                );
        }

    async get<T = unknown>(_key: string): Promise<T | null> {
          this.notImplemented('get');
        }

    async set<T = unknown>(_key: string, _value: T, _opts?: CacheOptions): Promise<void> {
          this.notImplemented('set');
        }

    async delete(_key: string): Promise<void> {
          this.notImplemented('delete');
        }

    async has(_key: string): Promise<boolean> {
          this.notImplemented('has');
        }

    async invalidateByPrefix(_prefix: string): Promise<void> {
          this.notImplemented('invalidateByPrefix');
        }

    async invalidateByTag(_tag: string): Promise<void> {
          this.notImplemented('invalidateByTag');
        }

    async clear(): Promise<void> {
          this.notImplemented('clear');
        }

    async size(): Promise<number> {
          this.notImplemented('size');
        }

    async keys(): Promise<string[]> {
          this.notImplemented('keys');
        }
  }
