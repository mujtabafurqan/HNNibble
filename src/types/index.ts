export interface HackerNewsStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
  kids?: number[];
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
}

export interface ArticleSummary {
  id: number;
  originalStory: HackerNewsStory;
  summary: string;
  keyPoints: string[];
  readingTime: number;
  tags: string[];
  summarizedAt: number;
}

export interface EnhancedStory extends HackerNewsStory {
  commentsUrl: string;
  timeAgo: string;
  domain?: string;
  extractedContent?: {
    success: boolean;
    content?: string;
    author?: string;
    siteName?: string;
    wordCount?: number;
    extractionMethod?: string;
    error?: string;
  };
  extractionStatus?: 'loading' | 'success' | 'failed' | 'none';
  summary?: import('./summarization').SummaryResponse;
  summaryStatus?: 'loading' | 'success' | 'failed' | 'none';
}

export interface UserPreferences {
  notificationsEnabled: boolean;
  summaryLength: 'short' | 'medium' | 'long';
  categories: string[];
  refreshInterval: number;
  darkMode: boolean;
}

export interface AppSettings {
  version: string;
  lastUpdated: number;
  cacheSize: number;
  apiEndpoint: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}