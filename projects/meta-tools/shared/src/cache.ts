/**
 * LRU Cache with TTL support for meta-tools
 */

import { CacheEntry } from './types.js';

export interface CacheOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTtlMs: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 100;
    this.defaultTtlMs = options.defaultTtlMs ?? 60000; // 1 minute default
  }

  /**
   * Get a value from cache if it exists and hasn't expired
   */
  get(key: string): T | undefined {
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
  set(key: string, value: T, ttlMs?: number): void {
    // Remove existing entry if present
    this.cache.delete(key);

    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs)
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number } {
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
  private cleanExpired(): void {
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
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`)
      .join('|');
    return `${prefix}:${sortedParams}`;
  }
}

// Pre-configured caches for different use cases
export const browserCache = new LRUCache<any>({
  maxSize: 50,
  defaultTtlMs: 30000 // 30 seconds - browser state changes quickly
});

export const supabaseCache = new LRUCache<any>({
  maxSize: 100,
  defaultTtlMs: 60000 // 1 minute
});

export const gdriveCache = new LRUCache<any>({
  maxSize: 50,
  defaultTtlMs: 300000 // 5 minutes - drive content is more stable
});

export const n8nCache = new LRUCache<any>({
  maxSize: 30,
  defaultTtlMs: 600000 // 10 minutes - workflow metadata is stable
});
