/**
 * In-memory cache utility for API responses
 */

import { CacheEntry } from '../types/hackerNews';
import { CACHE_CONFIG } from '../constants/config';

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private requestTracker = new Map<string, Promise<any>>();

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if cache entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    this.cache.set(key, entry);
    this.cleanupExpiredEntries();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.requestTracker.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const [, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      pendingRequests: this.requestTracker.size,
    };
  }

  /**
   * Prevent duplicate simultaneous requests
   */
  async withDeduplication<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    // Check if request is already in progress
    const existingRequest = this.requestTracker.get(key);
    if (existingRequest) {
      return existingRequest;
    }

    // Start new request
    const request = factory();
    this.requestTracker.set(key, request);

    try {
      const result = await request;
      this.requestTracker.delete(key);
      return result;
    } catch (error) {
      this.requestTracker.delete(key);
      throw error;
    }
  }

  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Singleton cache instance
export const cache = new MemoryCache();

/**
 * Cache key generators
 */
export const cacheKeys = {
  topStories: (limit?: number) => `top-stories:${limit || 'all'}`,
  bestStories: (limit?: number) => `best-stories:${limit || 'all'}`,
  newStories: (limit?: number) => `new-stories:${limit || 'all'}`,
  storyDetails: (id: number) => `story:${id}`,
  userDetails: (username: string) => `user:${username}`,
  storyList: (type: string, limit: number) => `story-list:${type}:${limit}`,
} as const;