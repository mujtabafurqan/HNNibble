/**
 * Hacker News API TypeScript Interfaces
 * Based on official HN API documentation: https://github.com/HackerNews/API
 */

export interface HackerNewsItem {
  /** Unique item identifier */
  id: number;
  /** Item type */
  type: 'story' | 'comment' | 'poll' | 'job' | 'pollopt';
  /** Username of item creator */
  by: string;
  /** Unix timestamp of item creation */
  time: number;
  /** Item title (stories, polls, jobs) */
  title?: string;
  /** Item URL (stories) */
  url?: string;
  /** Item text content (comments, text stories, polls, jobs) */
  text?: string;
  /** Item score (stories, polls) */
  score?: number;
  /** Number of descendant comments */
  descendants?: number;
  /** Array of child item IDs */
  kids?: number[];
  /** Parent item ID (comments) */
  parent?: number;
  /** Poll options (polls) */
  parts?: number[];
  /** True if item is deleted */
  deleted?: boolean;
  /** True if item is dead */
  dead?: boolean;
}

export interface HackerNewsUser {
  /** Username */
  id: string;
  /** User karma */
  karma: number;
  /** Unix timestamp of account creation */
  created: number;
  /** User bio/about text */
  about?: string;
  /** Array of submitted item IDs */
  submitted?: number[];
  /** Delay in minutes between posting */
  delay?: number;
}

export interface ApiResponse<T> {
  /** Response data */
  data: T | null;
  /** Error message if request failed */
  error: string | null;
  /** Request success status */
  success: boolean;
  /** Response timestamp */
  timestamp: number;
}

export interface StoryWithDetails extends HackerNewsItem {
  /** Story type enforced */
  type: 'story';
  /** Required fields for stories */
  title: string;
  score: number;
  /** Computed fields */
  commentsUrl: string;
  timeAgo: string;
  domain?: string;
}

export interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Cache entry timestamp */
  timestamp: number;
  /** Time-to-live in milliseconds */
  ttl: number;
}

export interface ApiError {
  /** Error message */
  message: string;
  /** Error code */
  code: 'NETWORK_ERROR' | 'TIMEOUT' | 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'UNKNOWN';
  /** Original error object */
  originalError?: Error;
  /** Request URL that failed */
  url?: string;
}

export interface RequestConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retry attempts */
  retries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
}

export type StoryType = 'top' | 'best' | 'new';