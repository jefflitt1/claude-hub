/**
 * LRU Cache with TTL support for meta-tools
 */
export interface CacheOptions {
    maxSize?: number;
    defaultTtlMs?: number;
}
export declare class LRUCache<T> {
    private cache;
    private maxSize;
    private defaultTtlMs;
    constructor(options?: CacheOptions);
    /**
     * Get a value from cache if it exists and hasn't expired
     */
    get(key: string): T | undefined;
    /**
     * Set a value in cache with optional TTL
     */
    set(key: string, value: T, ttlMs?: number): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete a specific key
     */
    delete(key: string): boolean;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    stats(): {
        size: number;
        maxSize: number;
    };
    /**
     * Remove all expired entries
     */
    private cleanExpired;
    /**
     * Generate a cache key from parameters
     */
    static generateKey(prefix: string, params: Record<string, any>): string;
}
export declare const browserCache: LRUCache<any>;
export declare const supabaseCache: LRUCache<any>;
export declare const gdriveCache: LRUCache<any>;
export declare const n8nCache: LRUCache<any>;
//# sourceMappingURL=cache.d.ts.map