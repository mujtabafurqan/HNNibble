/**
 * Full Pipeline Integration Tests
 * Tests the complete flow from HN API to content extraction to UI display
 */

import { hackerNewsApi } from '../../services/hackerNewsApi';
import { ContentExtractorService } from '../../services/contentExtractor';

// Mock console methods to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Full Pipeline Integration', () => {
  beforeEach(() => {
    // Clear caches before each test
    hackerNewsApi.clearCache();
    ContentExtractorService.clearCache();
  });

  describe('HN API Integration', () => {
    it('should fetch top stories successfully', async () => {
      const response = await hackerNewsApi.getTopStories(5);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data!.length).toBeLessThanOrEqual(5);
      expect(response.error).toBeNull();
    }, 10000);

    it('should fetch story details successfully', async () => {
      // First get some story IDs
      const storiesResponse = await hackerNewsApi.getTopStories(3);
      expect(storiesResponse.success).toBe(true);
      expect(storiesResponse.data).toBeDefined();
      
      if (storiesResponse.data && storiesResponse.data.length > 0) {
        const storyId = storiesResponse.data[0];
        const storyResponse = await hackerNewsApi.getItem(storyId);
        
        expect(storyResponse.success).toBe(true);
        expect(storyResponse.data).toBeDefined();
        expect(storyResponse.data!.id).toBe(storyId);
        expect(storyResponse.data!.type).toBe('story');
      }
    }, 15000);

    it('should fetch top stories with details', async () => {
      const response = await hackerNewsApi.getTopStoriesWithDetails(3);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data && response.data.length > 0) {
        const story = response.data[0];
        expect(story.id).toBeDefined();
        expect(story.title).toBeDefined();
        expect(story.by).toBeDefined();
        expect(story.score).toBeDefined();
        expect(story.commentsUrl).toBeDefined();
        expect(story.timeAgo).toBeDefined();
      }
    }, 20000);
  });

  describe('Content Extraction Integration', () => {
    it('should extract content from a well-known URL', async () => {
      const testUrl = 'https://httpbin.org/html';
      const result = await ContentExtractorService.extractArticleContent(testUrl);
      
      expect(result).toBeDefined();
      expect(result.url).toBe(testUrl);
      expect(result.title).toBeDefined();
      expect(result.extractionMethod).toBeDefined();
      // Note: extraction might fail for some URLs, but it should not throw
    }, 15000);

    it('should handle URL analysis correctly', () => {
      const testCases = [
        {
          url: 'https://github.com/user/repo',
          expectedType: 'github',
          expectedSpecialHandling: true,
        },
        {
          url: 'https://www.youtube.com/watch?v=test',
          expectedType: 'video',
          expectedSpecialHandling: true,
        },
        {
          url: 'https://example.com/document.pdf',
          expectedType: 'pdf',
          expectedSpecialHandling: true,
        },
        {
          url: 'https://blog.example.com/article',
          expectedType: 'article',
          expectedSpecialHandling: false,
        },
      ];

      testCases.forEach(({ url, expectedType, expectedSpecialHandling }) => {
        const analysis = ContentExtractorService.analyzeURL(url);
        expect(analysis.type).toBe(expectedType);
        expect(analysis.requiresSpecialHandling).toBe(expectedSpecialHandling);
        expect(analysis.isExtractable).toBe(true);
      });
    });

    it('should detect impossible extraction cases', () => {
      const impossibleUrls = [
        'data:text/plain;base64,SGVsbG8=',
        'javascript:alert("test")',
        'mailto:test@example.com',
      ];

      impossibleUrls.forEach(url => {
        const analysis = ContentExtractorService.analyzeURL(url);
        expect(analysis.isExtractable).toBe(false);
        expect(analysis.estimatedDifficulty).toBe('impossible');
      });
    });
  });

  describe('End-to-End Pipeline', () => {
    it('should complete full pipeline from stories to extracted content', async () => {
      // Step 1: Get stories
      const storiesResponse = await hackerNewsApi.getTopStoriesWithDetails(2);
      expect(storiesResponse.success).toBe(true);
      expect(storiesResponse.data).toBeDefined();
      
      if (!storiesResponse.data || storiesResponse.data.length === 0) {
        console.log('No stories returned, skipping extraction test');
        return;
      }

      // Step 2: Find a story with URL
      const storyWithUrl = storiesResponse.data.find(story => story.url);
      
      if (!storyWithUrl) {
        console.log('No stories with URLs found, skipping extraction test');
        return;
      }

      // Step 3: Extract content
      const extractionResult = await ContentExtractorService.extractArticleContent(storyWithUrl.url!);
      
      expect(extractionResult).toBeDefined();
      expect(extractionResult.url).toBe(storyWithUrl.url);
      expect(extractionResult.extractionMethod).toBeDefined();
      
      // Extraction might fail due to various reasons, but should not throw
      if (extractionResult.success) {
        expect(extractionResult.content).toBeDefined();
        expect(extractionResult.title).toBeDefined();
      } else {
        expect(extractionResult.error).toBeDefined();
      }
    }, 30000);

    it('should handle caching correctly', async () => {
      // Get stories twice and verify caching works
      const firstResponse = await hackerNewsApi.getTopStories(3);
      const secondResponse = await hackerNewsApi.getTopStories(3);
      
      expect(firstResponse.success).toBe(true);
      expect(secondResponse.success).toBe(true);
      expect(firstResponse.data).toEqual(secondResponse.data);
      
      // Verify cache stats
      const stats = hackerNewsApi.getStats();
      expect(stats.cache.totalEntries).toBeGreaterThan(0);
    }, 15000);

    it('should handle errors gracefully', async () => {
      // Test content extraction with invalid URL
      const invalidExtraction = await ContentExtractorService.extractArticleContent('invalid-url');
      expect(invalidExtraction.success).toBe(false);
      expect(invalidExtraction.error).toBeDefined();
      
      // Test content extraction with impossible URL
      const impossibleExtraction = await ContentExtractorService.extractArticleContent('javascript:alert("test")');
      expect(impossibleExtraction.success).toBe(false);
      expect(impossibleExtraction.error).toBeDefined();
    }, 10000);
  });

  describe('Performance Tests', () => {
    it('should fetch stories within reasonable time', async () => {
      const startTime = Date.now();
      const response = await hackerNewsApi.getTopStoriesWithDetails(5);
      const endTime = Date.now();
      
      expect(response.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);

    it('should handle concurrent extractions', async () => {
      const testUrls = [
        'https://httpbin.org/html',
        'https://httpbin.org/json',
        'https://httpbin.org',
      ];

      const startTime = Date.now();
      const promises = testUrls.map(url => 
        ContentExtractorService.extractArticleContent(url, { timeout: 5000 })
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(testUrls.length);
      expect(endTime - startTime).toBeLessThan(20000); // Should complete within 20 seconds
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.extractionMethod).toBeDefined();
      });
    }, 25000);
  });

  describe('Cache Management', () => {
    it('should clear caches successfully', () => {
      // Add some data to caches
      hackerNewsApi.getTopStories(1);
      
      // Clear caches
      hackerNewsApi.clearCache();
      ContentExtractorService.clearCache();
      
      // Verify caches are empty
      const hackerNewsStats = hackerNewsApi.getStats();
      const contentStats = ContentExtractorService.getCacheStats();
      
      expect(hackerNewsStats.cache.totalEntries).toBe(0);
      expect(contentStats.size).toBe(0);
    });

    it('should provide accurate cache statistics', async () => {
      // Perform some operations
      await hackerNewsApi.getTopStories(2);
      
      const stats = hackerNewsApi.getStats();
      expect(stats).toBeDefined();
      expect(stats.rateLimiter).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(typeof stats.cache.totalEntries).toBe('number');
    });
  });
});