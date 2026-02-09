/**
 * Simple TTL-based cache implementation
 *
 * Provides a simple in-memory cache with time-to-live (TTL) support.
 * Automatically cleans up expired entries.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple cache with TTL support
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private defaultTtl: number;

  /**
   * @param ttl - Default TTL in milliseconds (default: 60 seconds)
   * @param cleanupInterval - Cleanup interval in milliseconds (default: 60 seconds)
   */
  constructor(ttl = 60000, cleanupInterval = 60000) {
    this.defaultTtl = ttl;

    // Schedule periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, cleanupInterval);
  }

  /**
   * Get a value from the cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
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

    return entry.value;
  }

  /**
   * Set a value in the cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - TTL in milliseconds (optional, uses default if not provided)
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl ?? this.defaultTtl);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists and is not expired
   *
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key from the cache
   *
   * @param key - Cache key
   * @returns True if key was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Clean up expired entries
   *
   * @returns Number of entries removed
   */
  private cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Stop the cleanup timer
   *
   * Call this when done using the cache to prevent memory leaks
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

/**
 * Create a cache with the specified TTL
 *
 * @param ttl - Default TTL in milliseconds
 * @returns SimpleCache instance
 */
export function createCache<T>(ttl = 60000): SimpleCache<T> {
  return new SimpleCache<T>(ttl);
}
