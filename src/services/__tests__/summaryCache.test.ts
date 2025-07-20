import AsyncStorage from '@react-native-async-storage/async-storage';
import { SummaryCacheService } from '../summaryCache';
import { SummaryResponse, SummaryCache } from '../../types/summarization';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn()
}));

// Mock crypto-js
jest.mock('crypto-js', () => ({
  SHA256: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mocked-hash')
  })
}));

describe('SummaryCacheService', () => {
  let cacheService: SummaryCacheService;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (SummaryCacheService as any).instance = undefined;
    
    // Mock AsyncStorage responses
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockAsyncStorage.multiRemove.mockResolvedValue(undefined);
    
    cacheService = SummaryCacheService.getInstance();
  });

  describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'test content';
      const title = 'test title';
      
      const hash1 = cacheService.generateContentHash(content, title);
      const hash2 = cacheService.generateContentHash(content, title);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBe('mocked-hash');
    });

    it('should generate different hashes for different content', () => {
      const content1 = 'test content 1';
      const content2 = 'test content 2';
      const title = 'test title';
      
      // Mock different hashes for different inputs
      const mockCrypto = require('crypto-js');
      mockCrypto.SHA256
        .mockReturnValueOnce({ toString: () => 'hash1' })
        .mockReturnValueOnce({ toString: () => 'hash2' });
      
      const hash1 = cacheService.generateContentHash(content1, title);
      const hash2 = cacheService.generateContentHash(content2, title);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getCachedSummary', () => {
    it('should return null for non-existent cache entry', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await cacheService.getCachedSummary('test-hash');
      
      expect(result).toBeNull();
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('summary_cache_test-hash');
    });

    it('should return cached summary when found', async () => {
      const mockCacheEntry: SummaryCache = {
        contentHash: 'test-hash',
        summary: 'Test summary',
        createdAt: new Date(),
        accessCount: 0,
        lastAccessed: new Date(),
        metadata: { qualityScore: 0.8, extractedDate: new Date() },
        version: '1.0'
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCacheEntry));
      
      const result = await cacheService.getCachedSummary('test-hash');
      
      expect(result).toBeDefined();
      expect(result!.summary).toBe('Test summary');
      expect(result!.cached).toBe(true);
      expect(result!.model).toBe('cached');
    });

    it('should remove expired cache entries', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10); // 10 days old
      
      const expiredCacheEntry: SummaryCache = {
        contentHash: 'test-hash',
        summary: 'Expired summary',
        createdAt: expiredDate,
        accessCount: 0,
        lastAccessed: expiredDate,
        metadata: { qualityScore: 0.8, extractedDate: new Date() },
        version: '1.0'
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredCacheEntry));
      
      const result = await cacheService.getCachedSummary('test-hash');
      
      expect(result).toBeNull();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('should update access tracking when cache hit occurs', async () => {
      const mockCacheEntry: SummaryCache = {
        contentHash: 'test-hash',
        summary: 'Test summary',
        createdAt: new Date(),
        accessCount: 5,
        lastAccessed: new Date(),
        metadata: { qualityScore: 0.8, extractedDate: new Date() },
        version: '1.0'
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockCacheEntry));
      
      await cacheService.getCachedSummary('test-hash');
      
      // Should update the cache with incremented access count
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'summary_cache_test-hash',
        expect.stringContaining('"accessCount":6')
      );
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      
      const result = await cacheService.getCachedSummary('test-hash');
      
      expect(result).toBeNull();
    });
  });

  describe('storeSummary', () => {
    it('should store summary successfully', async () => {
      const contentHash = 'test-hash';
      const summary = 'Test summary';
      const metadata = { qualityScore: 0.8, extractedDate: new Date() };
      
      // Mock empty cache index
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      
      await cacheService.storeSummary(contentHash, summary, metadata);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'summary_cache_test-hash',
        expect.stringContaining(summary)
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cache_index',
        expect.stringContaining(contentHash)
      );
    });

    it('should trigger cleanup when cache is full', async () => {
      // Mock cache service with small max size
      cacheService.setConfig(2, 7); // max 2 items
      
      // Mock existing cache index with 2 items
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('["hash1", "hash2"]') // cache index
        .mockResolvedValueOnce(null) // stats
        .mockResolvedValueOnce(JSON.stringify({
          contentHash: 'hash1',
          summary: 'Summary 1',
          createdAt: new Date(Date.now() - 86400000), // 1 day old
          accessCount: 1,
          lastAccessed: new Date(Date.now() - 86400000),
          metadata: { qualityScore: 0.8 },
          version: '1.0'
        }))
        .mockResolvedValueOnce(JSON.stringify({
          contentHash: 'hash2',
          summary: 'Summary 2',
          createdAt: new Date(),
          accessCount: 5,
          lastAccessed: new Date(),
          metadata: { qualityScore: 0.8 },
          version: '1.0'
        }));
      
      await cacheService.storeSummary('new-hash', 'New summary', { qualityScore: 0.9 });
      
      // Should have triggered cleanup (multiRemove called)
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it('should handle storage errors', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(
        cacheService.storeSummary('test-hash', 'summary', { qualityScore: 0.8 })
      ).rejects.toThrow('Storage error');
    });
  });

  describe('removeCachedSummary', () => {
    it('should remove cached summary and update index', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('["test-hash", "other-hash"]');
      
      await cacheService.removeCachedSummary('test-hash');
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('summary_cache_test-hash');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cache_index',
        '["other-hash"]'
      );
    });

    it('should handle removal errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Remove error'));
      
      // Should not throw
      await expect(cacheService.removeCachedSummary('test-hash')).resolves.toBeUndefined();
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache entries', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('["hash1", "hash2", "hash3"]') // cache index
        .mockResolvedValueOnce(JSON.stringify({ // stats
          totalSummaries: 10,
          cachedSummaries: 5
        }));
      
      await cacheService.clearAllCache();
      
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        'summary_cache_hash1',
        'summary_cache_hash2',
        'summary_cache_hash3'
      ]);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'cache_index',
        '[]'
      );
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      // Mock cache index and stats
      mockAsyncStorage.getItem
        .mockResolvedValueOnce('["hash1", "hash2"]') // cache index (implicit from instance)
        .mockResolvedValueOnce(JSON.stringify({
          totalSummaries: 100,
          cachedSummaries: 80
        })); // stats
      
      const stats = await cacheService.getCacheStats();
      
      expect(stats.hitRate).toBe(80);
      expect(stats.maxSize).toBe(500); // default max size
    });

    it('should handle missing stats gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const stats = await cacheService.getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('cache cleanup', () => {
    it('should perform LRU cleanup when cache is full', async () => {
      cacheService.setConfig(3, 7); // Small cache for testing
      
      // Mock cache index
      mockAsyncStorage.getItem.mockResolvedValueOnce('["hash1", "hash2", "hash3", "hash4"]');
      
      // Mock cache entries with different access patterns
      const oldEntry = {
        contentHash: 'hash1',
        summary: 'Old summary',
        createdAt: new Date(Date.now() - 86400000 * 5), // 5 days old
        accessCount: 1,
        lastAccessed: new Date(Date.now() - 86400000 * 3), // 3 days ago
        metadata: { qualityScore: 0.8 },
        version: '1.0'
      };
      
      const recentEntry = {
        contentHash: 'hash2',
        summary: 'Recent summary',
        createdAt: new Date(),
        accessCount: 10,
        lastAccessed: new Date(),
        metadata: { qualityScore: 0.8 },
        version: '1.0'
      };

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(oldEntry))
        .mockResolvedValueOnce(JSON.stringify(recentEntry));
      
      // This should trigger cleanup
      await cacheService.storeSummary('new-hash', 'New summary', { qualityScore: 0.9 });
      
      expect(mockAsyncStorage.multiRemove).toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('should update cache configuration', () => {
      const newMaxSize = 1000;
      const newExpiryDays = 14;
      
      cacheService.setConfig(newMaxSize, newExpiryDays);
      
      // Configuration update should not throw
      expect(() => cacheService.setConfig(newMaxSize, newExpiryDays)).not.toThrow();
    });
  });

  describe('getDetailedStats', () => {
    it('should return detailed statistics', async () => {
      const mockStats = {
        totalSummaries: 150,
        successfulSummaries: 140,
        failedSummaries: 10,
        cachedSummaries: 120,
        totalCost: 2.45,
        averageProcessingTime: 1200,
        cacheHitRate: 80,
        averageQualityScore: 0.85
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockStats));
      
      const stats = await cacheService.getDetailedStats();
      
      expect(stats).toEqual(mockStats);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics to defaults', async () => {
      await cacheService.resetStats();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'summarization_stats',
        expect.stringContaining('"totalSummaries":0')
      );
    });
  });
});