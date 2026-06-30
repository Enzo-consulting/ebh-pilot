/**
 * cache/memoryCache.ts — In-Memory Cache Implementation
  *
   * Ticket 022 — Integration Engine & Domain Hooks
    *
     * PURPOSE:
      * Implements ICache using a JavaScript Map.
       * Suitable for single-process deployments and development.
        *
         * PERFORMANCE:
          * - O(1) get/set/delete operations
           * - O(n) prefix/tag invalidation (scans all keys)
            * - Automatic TTL expiry on read (lazy eviction)
             *
              * LIMITATIONS:
               * - Not shared across multiple Node.js processes
                * - Lost on process restart
                 * - For multi-instance deployments, use RedisCache instead
                  *
                   * FUTURE:
                    * Replace with RedisCache by updating CacheFactory.create()
                     */

                     import { ICache, CacheEntry, CacheOptions } from './types.js';

                     export class MemoryCache implements ICache {
                       private readonly store = new Map<string, CacheEntry & { tags?: string[] }>();

                         // ───────────────────────────────────────────────────────────────────────────
                           // GET
                             // ───────────────────────────────────────────────────────────────────────────

                               async get<T = unknown>(key: string): Promise<T | null> {
                                   const entry = this.store.get(key);
                                       if (!entry) return null;

                                           // Lazy TTL eviction
                                               if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
                                                     this.store.delete(key);
                                                           return null;
                                                               }

                                                                   return entry.value as T;
                                                                     }

                                                                       // ───────────────────────────────────────────────────────────────────────────
                                                                         // SET
                                                                           // ───────────────────────────────────────────────────────────────────────────

                                                                             async set<T = unknown>(key: string, value: T, opts?: CacheOptions): Promise<void> {
                                                                                 const ttlMs = opts?.ttl ? opts.ttl * 1000 : 0;
                                                                                     const entry: CacheEntry & { tags?: string[] } = {
                                                                                           key,
                                                                                                 value,
                                                                                                       createdAt: Date.now(),
                                                                                                             expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
                                                                                                                   tags: opts?.tags,
                                                                                                                       };
                                                                                                                           this.store.set(key, entry);
                                                                                                                             }
                                                                                                                             
                                                                                                                               // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                 // DELETE
                                                                                                                                   // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                   
                                                                                                                                     async delete(key: string): Promise<void> {
                                                                                                                                         this.store.delete(key);
                                                                                                                                           }
                                                                                                                                           
                                                                                                                                             // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                               // HAS
                                                                                                                                                 // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                 
                                                                                                                                                   async has(key: string): Promise<boolean> {
                                                                                                                                                       const val = await this.get(key);
                                                                                                                                                           return val !== null;
                                                                                                                                                             }
                                                                                                                                                             
                                                                                                                                                               // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                 // INVALIDATE BY PREFIX
                                                                                                                                                                   // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                   
                                                                                                                                                                     async invalidateByPrefix(prefix: string): Promise<void> {
                                                                                                                                                                         for (const key of this.store.keys()) {
                                                                                                                                                                               if (key.startsWith(prefix)) {
                                                                                                                                                                                       this.store.delete(key);
                                                                                                                                                                                             }
                                                                                                                                                                                                 }
                                                                                                                                                                                                   }
                                                                                                                                                                                                   
                                                                                                                                                                                                     // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                       // INVALIDATE BY TAG
                                                                                                                                                                                                         // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                         
                                                                                                                                                                                                           async invalidateByTag(tag: string): Promise<void> {
                                                                                                                                                                                                               for (const [key, entry] of this.store.entries()) {
                                                                                                                                                                                                                     if (entry.tags?.includes(tag)) {
                                                                                                                                                                                                                             this.store.delete(key);
                                                                                                                                                                                                                                   }
                                                                                                                                                                                                                                       }
                                                                                                                                                                                                                                         }
                                                                                                                                                                                                                                         
                                                                                                                                                                                                                                           // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                             // CLEAR
                                                                                                                                                                                                                                               // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                 async clear(): Promise<void> {
                                                                                                                                                                                                                                                     this.store.clear();
                                                                                                                                                                                                                                                       }
                                                                                                                                                                                                                                                       
                                                                                                                                                                                                                                                         // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                           // SIZE
                                                                                                                                                                                                                                                             // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                               async size(): Promise<number> {
                                                                                                                                                                                                                                                                   let count = 0;
                                                                                                                                                                                                                                                                       const now = Date.now();
                                                                                                                                                                                                                                                                           for (const entry of this.store.values()) {
                                                                                                                                                                                                                                                                                 if (entry.expiresAt === 0 || now <= entry.expiresAt) {
                                                                                                                                                                                                                                                                                         count++;
                                                                                                                                                                                                                                                                                               }
                                                                                                                                                                                                                                                                                                   }
                                                                                                                                                                                                                                                                                                       return count;
                                                                                                                                                                                                                                                                                                         }
                                                                                                                                                                                                                                                                                                         
                                                                                                                                                                                                                                                                                                           // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                                                                             // KEYS
                                                                                                                                                                                                                                                                                                               // ───────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                                                 async keys(): Promise<string[]> {
                                                                                                                                                                                                                                                                                                                     const now = Date.now();
                                                                                                                                                                                                                                                                                                                         const result: string[] = [];
                                                                                                                                                                                                                                                                                                                             for (const [key, entry] of this.store.entries()) {
                                                                                                                                                                                                                                                                                                                                   if (entry.expiresAt === 0 || now <= entry.expiresAt) {
                                                                                                                                                                                                                                                                                                                                           result.push(key);
                                                                                                                                                                                                                                                                                                                                                 }
                                                                                                                                                                                                                                                                                                                                                     }
                                                                                                                                                                                                                                                                                                                                                         return result;
                                                                                                                                                                                                                                                                                                                                                           }
                                                                                                                                                                                                                                                                                                                                                           }
                                                                                                                                                                                                                                                                                                                                                           
