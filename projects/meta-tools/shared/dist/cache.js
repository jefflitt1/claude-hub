/**
 * LRU Cache with TTL support for meta-tools
 */
export class LRUCache {
    cache = new Map();
    maxSize;
    defaultTtlMs;
    constructor(options = {}) {
        this.maxSize = options.maxSize ?? 100;
        this.defaultTtlMs = options.defaultTtlMs ?? 60000; // 1 minute default
    }
    /**
     * Get a value from cache if it exists and hasn't expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    /**
     * Set a value in cache with optional TTL
     */
    set(key, value, ttlMs) {
        // Remove existing entry if present
        this.cache.delete(key);
        // Evict oldest entries if at capacity
        while (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        const entry = {
            value,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs)
        };
        this.cache.set(key, entry);
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * Delete a specific key
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    stats() {
        // Clean expired entries first
        this.cleanExpired();
        return {
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }
    /**
     * Remove all expired entries
     */
    cleanExpired() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Generate a cache key from parameters
     */
    static generateKey(prefix, params) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(k => `${k}:${JSON.stringify(params[k])}`)
            .join('|');
        return `${prefix}:${sortedParams}`;
    }
}
// Pre-configured caches for different use cases
export const browserCache = new LRUCache({
    maxSize: 50,
    defaultTtlMs: 30000 // 30 seconds - browser state changes quickly
});
export const supabaseCache = new LRUCache({
    maxSize: 100,
    defaultTtlMs: 60000 // 1 minute
});
export const gdriveCache = new LRUCache({
    maxSize: 50,
    defaultTtlMs: 300000 // 5 minutes - drive content is more stable
});
export const n8nCache = new LRUCache({
    maxSize: 30,
    defaultTtlMs: 600000 // 10 minutes - workflow metadata is stable
});
//# sourceMappingURL=cache.js.map