/**
 * Hacker News API Service
 * Provides robust API integration with error handling, rate limiting, and caching
 */

import {
  HackerNewsItem,
  HackerNewsUser,
  ApiResponse,
  StoryWithDetails,
  ApiError,
} from '../types/hackerNews';
import { HN_API_CONFIG, CACHE_CONFIG, APP_CONFIG } from '../constants/config';
import { cache, cacheKeys } from '../utils/cache';

class RateLimiter {
  private requests: number[] = [];

  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - HN_API_CONFIG.RATE_LIMIT.WINDOW_SIZE;
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => time > windowStart);
    
    // Check if we're under the limit
    return this.requests.length < HN_API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getStats() {
    const now = Date.now();
    const windowStart = now - HN_API_CONFIG.RATE_LIMIT.WINDOW_SIZE;
    const recentRequests = this.requests.filter(time => time > windowStart);
    
    return {
      requestsInWindow: recentRequests.length,
      maxRequests: HN_API_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
      canMakeRequest: this.canMakeRequest(),
    };
  }
}

class HackerNewsApiService {
  private rateLimiter = new RateLimiter();

  /**
   * Make HTTP request with timeout, retries, and error handling
   */
  private async makeRequest<T>(url: string): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    // Check rate limiting
    if (!this.rateLimiter.canMakeRequest()) {
      return {
        data: null,
        error: 'Rate limit exceeded. Please try again later.',
        success: false,
        timestamp: Date.now(),
      };
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= HN_API_CONFIG.REQUEST.MAX_RETRIES; attempt++) {
      try {
        this.rateLimiter.recordRequest();
        
        if (APP_CONFIG.LOGGING.ENABLE_API_LOGS) {
          console.log(`[API] ${attempt > 0 ? `Retry ${attempt}: ` : ''}GET ${url}`);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          HN_API_CONFIG.REQUEST.TIMEOUT
        );

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (APP_CONFIG.LOGGING.ENABLE_PERFORMANCE_LOGS) {
          console.log(`[API] Request completed in ${Date.now() - startTime}ms`);
        }

        return {
          data: data as T,
          error: null,
          success: true,
          timestamp: Date.now(),
        };
      } catch (error: any) {
        lastError = error;
        
        if (APP_CONFIG.LOGGING.ENABLE_ERROR_LOGS) {
          console.warn(`[API] Attempt ${attempt + 1} failed:`, error.message);
        }

        // Don't retry on abort (timeout) or if this is the last attempt
        if (error.name === 'AbortError' || attempt === HN_API_CONFIG.REQUEST.MAX_RETRIES) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          HN_API_CONFIG.REQUEST.RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000,
          HN_API_CONFIG.REQUEST.MAX_RETRY_DELAY
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Create standardized error response
    const apiError: ApiError = this.createApiError(lastError, url);
    
    return {
      data: null,
      error: apiError.message,
      success: false,
      timestamp: Date.now(),
    };
  }

  /**
   * Create standardized API error
   */
  private createApiError(error: Error | null, url?: string): ApiError {
    if (!error) {
      return {
        message: 'Unknown error occurred',
        code: 'UNKNOWN',
        url,
      };
    }

    let code: ApiError['code'] = 'UNKNOWN';
    let message = error.message;

    if (error.name === 'AbortError') {
      code = 'TIMEOUT';
      message = 'Request timed out';
    } else if (error.message.includes('fetch')) {
      code = 'NETWORK_ERROR';
      message = 'Network error - please check your connection';
    } else if (error.message.includes('404')) {
      code = 'NOT_FOUND';
      message = 'Item not found';
    } else if (error.message.includes('429')) {
      code = 'RATE_LIMITED';
      message = 'Too many requests - please slow down';
    }

    return {
      message,
      code,
      originalError: error,
      url,
    };
  }

  /**
   * Get individual item by ID
   */
  async getItem(id: number): Promise<ApiResponse<HackerNewsItem>> {
    const cacheKey = cacheKeys.storyDetails(id);
    
    // Check cache first
    const cached = cache.get<HackerNewsItem>(cacheKey);
    if (cached) {
      return {
        data: cached,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    }

    return cache.withDeduplication(cacheKey, async () => {
      const url = `${HN_API_CONFIG.BASE_URL}${HN_API_CONFIG.ENDPOINTS.ITEM}/${id}.json`;
      const response = await this.makeRequest<HackerNewsItem>(url);
      
      if (response.success && response.data) {
        cache.set(cacheKey, response.data, CACHE_CONFIG.TTL.STORY_DETAILS);
      }
      
      return response;
    });
  }

  /**
   * Get top story IDs
   */
  async getTopStories(limit?: number): Promise<ApiResponse<number[]>> {
    const cacheKey = cacheKeys.topStories(limit);
    
    // Check cache first
    const cached = cache.get<number[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    }

    return cache.withDeduplication(cacheKey, async () => {
      const url = `${HN_API_CONFIG.BASE_URL}${HN_API_CONFIG.ENDPOINTS.TOP_STORIES}`;
      const response = await this.makeRequest<number[]>(url);
      
      if (response.success && response.data) {
        const stories = limit ? response.data.slice(0, limit) : response.data;
        cache.set(cacheKey, stories, CACHE_CONFIG.TTL.STORY_LIST);
        return { ...response, data: stories };
      }
      
      return response;
    });
  }

  /**
   * Get best story IDs
   */
  async getBestStories(limit?: number): Promise<ApiResponse<number[]>> {
    const cacheKey = cacheKeys.bestStories(limit);
    
    const cached = cache.get<number[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    }

    return cache.withDeduplication(cacheKey, async () => {
      const url = `${HN_API_CONFIG.BASE_URL}${HN_API_CONFIG.ENDPOINTS.BEST_STORIES}`;
      const response = await this.makeRequest<number[]>(url);
      
      if (response.success && response.data) {
        const stories = limit ? response.data.slice(0, limit) : response.data;
        cache.set(cacheKey, stories, CACHE_CONFIG.TTL.STORY_LIST);
        return { ...response, data: stories };
      }
      
      return response;
    });
  }

  /**
   * Get new story IDs
   */
  async getNewStories(limit?: number): Promise<ApiResponse<number[]>> {
    const cacheKey = cacheKeys.newStories(limit);
    
    const cached = cache.get<number[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    }

    return cache.withDeduplication(cacheKey, async () => {
      const url = `${HN_API_CONFIG.BASE_URL}${HN_API_CONFIG.ENDPOINTS.NEW_STORIES}`;
      const response = await this.makeRequest<number[]>(url);
      
      if (response.success && response.data) {
        const stories = limit ? response.data.slice(0, limit) : response.data;
        cache.set(cacheKey, stories, CACHE_CONFIG.TTL.STORY_LIST);
        return { ...response, data: stories };
      }
      
      return response;
    });
  }

  /**
   * Get top stories with full details
   */
  async getTopStoriesWithDetails(limit: number = APP_CONFIG.DEFAULT_STORY_LIMIT): Promise<ApiResponse<StoryWithDetails[]>> {
    const cacheKey = cacheKeys.storyList('top-detailed', limit);
    
    const cached = cache.get<StoryWithDetails[]>(cacheKey);
    if (cached) {
      return {
        data: cached,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    }

    return cache.withDeduplication(cacheKey, async () => {
      // Get story IDs first
      const storyIdsResponse = await this.getTopStories(limit);
      if (!storyIdsResponse.success || !storyIdsResponse.data) {
        return {
          data: null,
          error: storyIdsResponse.error || 'Failed to fetch story IDs',
          success: false,
          timestamp: Date.now(),
        };
      }

      // Fetch details for each story in parallel
      const storyPromises = storyIdsResponse.data.map(id => this.getItem(id));
      const storyResponses = await Promise.all(storyPromises);
      
      // Filter successful responses and ensure they're stories
      const stories: StoryWithDetails[] = [];
      const errors: string[] = [];
      
      for (const response of storyResponses) {
        if (response.success && response.data && response.data.type === 'story') {
          const story = this.enhanceStory(response.data);
          stories.push(story);
        } else if (!response.success) {
          errors.push(response.error || 'Unknown error');
        }
      }

      if (stories.length === 0) {
        return {
          data: null,
          error: `No stories could be loaded. Errors: ${errors.join(', ')}`,
          success: false,
          timestamp: Date.now(),
        };
      }

      // Cache the result
      cache.set(cacheKey, stories, CACHE_CONFIG.TTL.STORY_DETAILS);
      
      return {
        data: stories,
        error: errors.length > 0 ? `Some stories failed to load: ${errors.slice(0, 3).join(', ')}` : null,
        success: true,
        timestamp: Date.now(),
      };
    });
  }

  /**
   * Get user details
   */
  async getUser(username: string): Promise<ApiResponse<HackerNewsUser>> {
    const cacheKey = cacheKeys.userDetails(username);
    
    const cached = cache.get<HackerNewsUser>(cacheKey);
    if (cached) {
      return {
        data: cached,
        error: null,
        success: true,
        timestamp: Date.now(),
      };
    }

    return cache.withDeduplication(cacheKey, async () => {
      const url = `${HN_API_CONFIG.BASE_URL}${HN_API_CONFIG.ENDPOINTS.USER}/${username}.json`;
      const response = await this.makeRequest<HackerNewsUser>(url);
      
      if (response.success && response.data) {
        cache.set(cacheKey, response.data, CACHE_CONFIG.TTL.USER_DETAILS);
      }
      
      return response;
    });
  }

  /**
   * Enhance story with computed fields
   */
  private enhanceStory(item: HackerNewsItem): StoryWithDetails {
    const story = item as StoryWithDetails;
    
    // Add computed fields
    story.commentsUrl = `https://news.ycombinator.com/item?id=${story.id}`;
    story.timeAgo = this.formatTimeAgo(story.time);
    
    if (story.url) {
      try {
        const url = new URL(story.url);
        story.domain = url.hostname.replace('www.', '');
      } catch (e) {
        // Invalid URL, skip domain extraction
      }
    }
    
    return story;
  }

  /**
   * Format timestamp as "time ago" string
   */
  private formatTimeAgo(unixTime: number): string {
    const now = Date.now();
    const diffMs = now - (unixTime * 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  }

  /**
   * Get API service statistics
   */
  getStats() {
    return {
      rateLimiter: this.rateLimiter.getStats(),
      cache: cache.getStats(),
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    cache.clear();
  }
}

// Export singleton instance
export const hackerNewsApi = new HackerNewsApiService();
export default hackerNewsApi;