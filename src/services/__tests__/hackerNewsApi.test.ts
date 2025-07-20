/**
 * Hacker News API Service Tests
 */

import { hackerNewsApi } from '../hackerNewsApi';
import { HackerNewsItem } from '../../types/hackerNews';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console methods to avoid noise in tests
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('HackerNewsApiService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    hackerNewsApi.clearCache();
    jest.clearAllTimers();
  });

  describe('getTopStories', () => {
    it('should fetch top stories successfully', async () => {
      const mockStoryIds = [1, 2, 3, 4, 5];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStoryIds),
      });

      const result = await hackerNewsApi.getTopStories(5);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStoryIds);
      expect(result.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await hackerNewsApi.getTopStories(5);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    }, 10000);

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await hackerNewsApi.getTopStories(5);

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    }, 10000);

    it('should limit results when limit is provided', async () => {
      const mockStoryIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStoryIds),
      });

      const result = await hackerNewsApi.getTopStories(3);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('should use cached results on subsequent calls', async () => {
      const mockStoryIds = [1, 2, 3];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStoryIds),
      });

      // First call
      const result1 = await hackerNewsApi.getTopStories(3);
      // Second call (should use cache)
      const result2 = await hackerNewsApi.getTopStories(3);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).toEqual(result2.data);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });
  });

  describe('getItem', () => {
    it('should fetch story details successfully', async () => {
      const mockStory: HackerNewsItem = {
        id: 123,
        type: 'story',
        by: 'testuser',
        time: 1577836800, // 2020-01-01
        title: 'Test Story',
        url: 'https://example.com',
        score: 100,
        descendants: 25,
        kids: [124, 125, 126],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStory),
      });

      const result = await hackerNewsApi.getItem(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStory);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hacker-news.firebaseio.com/v0/item/123.json',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
        })
      );
    });

    it('should handle item not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const result = await hackerNewsApi.getItem(999999);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should cache story details', async () => {
      const mockStory: HackerNewsItem = {
        id: 123,
        type: 'story',
        by: 'testuser',
        time: 1577836800,
        title: 'Test Story',
        score: 100,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStory),
      });

      // First call
      const result1 = await hackerNewsApi.getItem(123);
      // Second call (should use cache)
      const result2 = await hackerNewsApi.getItem(123);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data).toEqual(result2.data);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTopStoriesWithDetails', () => {
    it('should fetch stories with full details', async () => {
      const mockStoryIds = [1, 2];
      const mockStory1: HackerNewsItem = {
        id: 1,
        type: 'story',
        by: 'user1',
        time: 1577836800,
        title: 'Story 1',
        url: 'https://example1.com',
        score: 100,
        descendants: 10,
      };
      const mockStory2: HackerNewsItem = {
        id: 2,
        type: 'story',
        by: 'user2',
        time: 1577836900,
        title: 'Story 2',
        url: 'https://example2.com',
        score: 200,
        descendants: 20,
      };

      // Mock the top stories call
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStoryIds),
        })
        // Mock individual story calls
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStory1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStory2),
        });

      const result = await hackerNewsApi.getTopStoriesWithDetails(2);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].title).toBe('Story 1');
      expect(result.data![1].title).toBe('Story 2');
      // Check enhanced fields
      expect(result.data![0].commentsUrl).toBe('https://news.ycombinator.com/item?id=1');
      expect(result.data![0].timeAgo).toBeDefined();
      expect(result.data![0].domain).toBe('example1.com');
    });

    it('should handle mixed success/failure when fetching story details', async () => {
      const mockStoryIds = [1, 2];
      const mockStory1: HackerNewsItem = {
        id: 1,
        type: 'story',
        by: 'user1',
        time: 1577836800,
        title: 'Story 1',
        score: 100,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStoryIds),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStory1),
        })
        .mockRejectedValueOnce(new Error('Failed to fetch story 2'));

      const result = await hackerNewsApi.getTopStoriesWithDetails(2);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].title).toBe('Story 1');
      expect(result.error).toContain('Some stories failed to load');
    }, 15000);

    it('should filter out non-story items', async () => {
      const mockStoryIds = [1, 2];
      const mockStory: HackerNewsItem = {
        id: 1,
        type: 'story',
        by: 'user1',
        time: 1577836800,
        title: 'Story 1',
        score: 100,
      };
      const mockComment: HackerNewsItem = {
        id: 2,
        type: 'comment',
        by: 'user2',
        time: 1577836900,
        text: 'This is a comment',
        parent: 1,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStoryIds),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStory),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockComment),
        });

      const result = await hackerNewsApi.getTopStoriesWithDetails(2);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].type).toBe('story');
    });
  });

  describe('Error handling and retries', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should retry failed requests with exponential backoff', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([1, 2, 3]),
        });

      const resultPromise = hackerNewsApi.getTopStories(3);
      
      // Fast-forward timers to trigger retries
      await jest.runAllTimersAsync();
      
      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 15000);

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent network error'));

      const resultPromise = hackerNewsApi.getTopStories(3);
      
      // Fast-forward timers
      await jest.runAllTimersAsync();
      
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Persistent network error');
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 15000);
  });

  describe('Rate limiting', () => {
    it('should track requests in rate limiter', () => {
      const stats = hackerNewsApi.getStats();
      
      expect(stats.rateLimiter).toHaveProperty('requestsInWindow');
      expect(stats.rateLimiter).toHaveProperty('maxRequests');
      expect(stats.rateLimiter).toHaveProperty('canMakeRequest');
      expect(stats.rateLimiter.maxRequests).toBe(100);
    });
  });

  describe('API Statistics', () => {
    it('should provide accurate statistics', () => {
      const stats = hackerNewsApi.getStats();
      
      expect(stats).toHaveProperty('rateLimiter');
      expect(stats).toHaveProperty('cache');
      expect(stats.rateLimiter).toHaveProperty('requestsInWindow');
      expect(stats.rateLimiter).toHaveProperty('maxRequests');
      expect(stats.rateLimiter).toHaveProperty('canMakeRequest');
      expect(stats.cache).toHaveProperty('totalEntries');
      expect(stats.cache).toHaveProperty('activeEntries');
    });
  });

  describe('Cache management', () => {
    it('should clear all caches', async () => {
      // Add something to cache first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([1, 2, 3]),
      });
      
      await hackerNewsApi.getTopStories(3);
      
      let stats = hackerNewsApi.getStats();
      expect(stats.cache.totalEntries).toBeGreaterThan(0);
      
      // Clear cache
      hackerNewsApi.clearCache();
      
      stats = hackerNewsApi.getStats();
      expect(stats.cache.totalEntries).toBe(0);
    });
  });
});