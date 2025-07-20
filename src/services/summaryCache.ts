import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { SummaryCache, SummaryResponse, SummarizationStats } from '../types/summarization';

const CACHE_PREFIX = 'summary_cache_';
const STATS_KEY = 'summarization_stats';
const CACHE_INDEX_KEY = 'cache_index';

export class SummaryCacheService {
  private static instance: SummaryCacheService;
  private cacheIndex: Set<string> = new Set();
  private maxCacheSize: number = 500;
  private expiryDays: number = 7;

  private constructor() {
    this.loadCacheIndex();
  }

  public static getInstance(): SummaryCacheService {
    if (!SummaryCacheService.instance) {
      SummaryCacheService.instance = new SummaryCacheService();
    }
    return SummaryCacheService.instance;
  }

  public setConfig(maxCacheSize: number, expiryDays: number): void {
    this.maxCacheSize = maxCacheSize;
    this.expiryDays = expiryDays;
  }

  public generateContentHash(content: string, title: string): string {
    const combined = `${title}:${content}`;
    return CryptoJS.SHA256(combined).toString();
  }

  public async getCachedSummary(contentHash: string): Promise<SummaryResponse | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${contentHash}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) {
        return null;
      }

      const cached: SummaryCache = JSON.parse(cachedData);
      
      // Check if cache entry has expired
      const now = new Date();
      const cacheAge = now.getTime() - new Date(cached.createdAt).getTime();
      const maxAge = this.expiryDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      
      if (cacheAge > maxAge) {
        await this.removeCachedSummary(contentHash);
        return null;
      }

      // Update access tracking
      cached.accessCount += 1;
      cached.lastAccessed = now;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));

      // Return as SummaryResponse with cache flag
      const response: SummaryResponse = {
        summary: cached.summary,
        wordCount: cached.summary.split(' ').length,
        confidence: cached.metadata.qualityScore,
        tokensUsed: 0, // Not tracked for cached responses
        processingTime: 0,
        cached: true,
        model: 'cached',
        metadata: cached.metadata
      };

      await this.updateStats(stats => ({
        ...stats,
        cachedSummaries: stats.cachedSummaries + 1
      }));

      return response;
    } catch (error) {
      console.error('Error retrieving cached summary:', error);
      return null;
    }
  }

  public async storeSummary(
    contentHash: string,
    summary: string,
    metadata: any,
    version: string = '1.0'
  ): Promise<void> {
    try {
      const now = new Date();
      const cacheEntry: SummaryCache = {
        contentHash,
        summary,
        createdAt: now,
        accessCount: 0,
        lastAccessed: now,
        metadata,
        version
      };

      const cacheKey = `${CACHE_PREFIX}${contentHash}`;
      
      // Check if we need to cleanup old entries before adding new ones
      if (this.cacheIndex.size >= this.maxCacheSize) {
        await this.performCacheCleanup();
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      this.cacheIndex.add(contentHash);
      await this.saveCacheIndex();

      await this.updateStats(stats => ({
        ...stats,
        totalSummaries: stats.totalSummaries + 1
      }));
    } catch (error) {
      console.error('Error storing summary in cache:', error);
      throw error;
    }
  }

  public async removeCachedSummary(contentHash: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${contentHash}`;
      await AsyncStorage.removeItem(cacheKey);
      this.cacheIndex.delete(contentHash);
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Error removing cached summary:', error);
    }
  }

  public async clearAllCache(): Promise<void> {
    try {
      const keys = Array.from(this.cacheIndex).map(hash => `${CACHE_PREFIX}${hash}`);
      await AsyncStorage.multiRemove(keys);
      this.cacheIndex.clear();
      await this.saveCacheIndex();
      
      await this.updateStats(stats => ({
        ...stats,
        totalSummaries: 0,
        cachedSummaries: 0
      }));
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  public async getCacheStats(): Promise<{
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      const stats = await this.getStats();
      const hitRate = stats.totalSummaries > 0 
        ? (stats.cachedSummaries / stats.totalSummaries) * 100 
        : 0;

      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;

      if (this.cacheIndex.size > 0) {
        const timestamps: Date[] = [];
        
        for (const hash of Array.from(this.cacheIndex).slice(0, 10)) { // Sample first 10 for performance
          const cacheKey = `${CACHE_PREFIX}${hash}`;
          const cachedData = await AsyncStorage.getItem(cacheKey);
          if (cachedData) {
            const cached: SummaryCache = JSON.parse(cachedData);
            timestamps.push(new Date(cached.createdAt));
          }
        }

        if (timestamps.length > 0) {
          timestamps.sort((a, b) => a.getTime() - b.getTime());
          oldestEntry = timestamps[0];
          newestEntry = timestamps[timestamps.length - 1];
        }
      }

      return {
        size: this.cacheIndex.size,
        maxSize: this.maxCacheSize,
        hitRate,
        oldestEntry,
        newestEntry
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        size: 0,
        maxSize: this.maxCacheSize,
        hitRate: 0
      };
    }
  }

  private async performCacheCleanup(): Promise<void> {
    try {
      const entriesToRemove = Math.max(1, Math.floor(this.maxCacheSize * 0.1)); // Remove 10%
      const entries: Array<{ hash: string; lastAccessed: Date; accessCount: number }> = [];

      // Collect cache entry metadata for LRU cleanup
      for (const hash of this.cacheIndex) {
        const cacheKey = `${CACHE_PREFIX}${hash}`;
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          const cached: SummaryCache = JSON.parse(cachedData);
          entries.push({
            hash,
            lastAccessed: new Date(cached.lastAccessed),
            accessCount: cached.accessCount
          });
        }
      }

      // Sort by access frequency and recency (LRU with frequency consideration)
      entries.sort((a, b) => {
        const scoreA = a.accessCount * 0.3 + (Date.now() - a.lastAccessed.getTime()) * 0.7;
        const scoreB = b.accessCount * 0.3 + (Date.now() - b.lastAccessed.getTime()) * 0.7;
        return scoreB - scoreA; // Higher score = less valuable, remove first
      });

      // Remove least valuable entries
      const toRemove = entries.slice(0, entriesToRemove);
      const keysToRemove = toRemove.map(entry => `${CACHE_PREFIX}${entry.hash}`);
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      for (const entry of toRemove) {
        this.cacheIndex.delete(entry.hash);
      }
      
      await this.saveCacheIndex();
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (indexData) {
        const hashes: string[] = JSON.parse(indexData);
        this.cacheIndex = new Set(hashes);
      }
    } catch (error) {
      console.error('Error loading cache index:', error);
      this.cacheIndex = new Set();
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const hashes = Array.from(this.cacheIndex);
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(hashes));
    } catch (error) {
      console.error('Error saving cache index:', error);
    }
  }

  private async getStats(): Promise<SummarizationStats> {
    try {
      const statsData = await AsyncStorage.getItem(STATS_KEY);
      if (statsData) {
        return JSON.parse(statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }

    // Return default stats
    return {
      totalSummaries: 0,
      successfulSummaries: 0,
      failedSummaries: 0,
      cachedSummaries: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      averageQualityScore: 0
    };
  }

  private async updateStats(
    updater: (stats: SummarizationStats) => SummarizationStats
  ): Promise<void> {
    try {
      const currentStats = await this.getStats();
      const newStats = updater(currentStats);
      
      // Recalculate derived metrics
      newStats.cacheHitRate = newStats.totalSummaries > 0 
        ? (newStats.cachedSummaries / newStats.totalSummaries) * 100 
        : 0;
      
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats));
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  public async getDetailedStats(): Promise<SummarizationStats> {
    return this.getStats();
  }

  public async resetStats(): Promise<void> {
    const defaultStats: SummarizationStats = {
      totalSummaries: 0,
      successfulSummaries: 0,
      failedSummaries: 0,
      cachedSummaries: 0,
      totalCost: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      averageQualityScore: 0
    };
    
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(defaultStats));
  }
}