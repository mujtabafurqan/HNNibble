/**
 * Application Configuration Constants
 */

export const HN_API_CONFIG = {
  /** Base URL for Hacker News API */
  BASE_URL: 'https://hacker-news.firebaseio.com/v0',
  
  /** API endpoints */
  ENDPOINTS: {
    ITEM: '/item',
    TOP_STORIES: '/topstories.json',
    BEST_STORIES: '/beststories.json',
    NEW_STORIES: '/newstories.json',
    MAX_ITEM: '/maxitem.json',
    USER: '/user',
  },
  
  /** Request configuration */
  REQUEST: {
    /** Request timeout in milliseconds */
    TIMEOUT: 5000,
    /** Maximum retry attempts */
    MAX_RETRIES: 3,
    /** Base retry delay in milliseconds */
    RETRY_DELAY: 1000,
    /** Maximum retry delay in milliseconds */
    MAX_RETRY_DELAY: 5000,
  },
  
  /** Rate limiting configuration */
  RATE_LIMIT: {
    /** Maximum requests per minute */
    MAX_REQUESTS_PER_MINUTE: 100,
    /** Window size for rate limiting in milliseconds */
    WINDOW_SIZE: 60000,
  },
} as const;

export const CACHE_CONFIG = {
  /** Cache durations in milliseconds */
  TTL: {
    /** Top stories list cache duration (5 minutes) */
    STORY_LIST: 5 * 60 * 1000,
    /** Individual story details cache duration (10 minutes) */
    STORY_DETAILS: 10 * 60 * 1000,
    /** User details cache duration (30 minutes) */
    USER_DETAILS: 30 * 60 * 1000,
  },
  
  /** Maximum cache entries per type */
  MAX_ENTRIES: {
    STORY_LISTS: 10,
    STORY_DETAILS: 500,
    USER_DETAILS: 100,
  },
} as const;

export const CONTENT_EXTRACTION_CONFIG = {
  /** Default extraction options */
  DEFAULT_OPTIONS: {
    /** Request timeout in milliseconds */
    TIMEOUT: 10000,
    /** Maximum content length to extract */
    MAX_CONTENT_LENGTH: 100000,
    /** Minimum content length required */
    MIN_CONTENT_LENGTH: 100,
    /** Whether to include images in extraction */
    INCLUDE_IMAGES: false,
  },
  
  /** User agent rotation for web scraping */
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
  ],
  
  /** Content validation thresholds */
  VALIDATION: {
    /** Minimum word count for valid content */
    MIN_WORD_COUNT: 100,
    /** Maximum word count to prevent huge extractions */
    MAX_WORD_COUNT: 50000,
    /** Minimum title length */
    MIN_TITLE_LENGTH: 10,
    /** Maximum title length */
    MAX_TITLE_LENGTH: 300,
    /** Minimum validation score to consider content valid */
    MIN_VALIDATION_SCORE: 60,
  },
  
  /** Cache configuration for extracted content */
  CACHE: {
    /** Cache duration in milliseconds (24 hours) */
    DURATION: 24 * 60 * 60 * 1000,
    /** Maximum cache entries */
    MAX_ENTRIES: 1000,
  },
  
  /** Retry configuration for failed requests */
  RETRY: {
    /** Maximum retry attempts */
    MAX_ATTEMPTS: 3,
    /** Base delay between retries in milliseconds */
    BASE_DELAY: 1000,
    /** Maximum delay between retries in milliseconds */
    MAX_DELAY: 5000,
  },
  
  /** Domains known to be problematic for extraction */
  BLACKLISTED_DOMAINS: [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'tiktok.com',
  ],
  
  /** Special handling domains */
  SPECIAL_DOMAINS: {
    GITHUB: ['github.com'],
    YOUTUBE: ['youtube.com', 'youtu.be'],
    PDF: ['.pdf'],
    ACADEMIC: ['arxiv.org', 'doi.org', 'pubmed.ncbi.nlm.nih.gov'],
    DOCUMENTATION: ['docs.', '/docs/', 'documentation.'],
  },
} as const;

export const APP_CONFIG = {
  /** Default number of stories to fetch */
  DEFAULT_STORY_LIMIT: 30,
  
  /** Maximum stories to fetch at once */
  MAX_STORY_LIMIT: 100,
  
  /** Development mode flag */
  IS_DEV: process.env.NODE_ENV === 'development',
  
  /** Logging configuration */
  LOGGING: {
    /** Enable API request logging */
    ENABLE_API_LOGS: process.env.NODE_ENV === 'development',
    /** Enable performance logging */
    ENABLE_PERFORMANCE_LOGS: process.env.NODE_ENV === 'development',
    /** Enable error logging */
    ENABLE_ERROR_LOGS: true,
  },
} as const;