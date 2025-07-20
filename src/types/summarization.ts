export interface SummaryRequest {
  content: string;
  title: string;
  url: string;
  priority: 'high' | 'normal' | 'low';
  maxTokens?: number;
  model?: string;
}

export interface SummaryResponse {
  summary: string;
  wordCount: number;
  confidence: number;
  tokensUsed: number;
  processingTime: number;
  cached: boolean;
  model: string;
  cost?: number;
  metadata: SummaryMetadata;
}

export interface SummaryMetadata {
  readabilityScore?: number;
  sentimentScore?: number;
  extractedDate?: string; // ISO string instead of Date object
  qualityScore: number;
  categories?: string[];
}

export interface SummaryCache {
  contentHash: string;
  summary: string;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  metadata: SummaryMetadata;
  version: string;
}

export interface SummaryQueueItem {
  id: string;
  request: SummaryRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  response?: SummaryResponse;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface BatchSummaryRequest {
  articles: ExtractedContent[];
  priority: 'high' | 'normal' | 'low';
  maxConcurrent?: number;
  progressCallback?: (completed: number, total: number) => void;
}

export interface BatchSummaryResponse {
  results: Array<{
    contentHash: string;
    response?: SummaryResponse;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  totalCost: number;
  processingTime: number;
}

export interface ExtractedContent {
  title: string;
  content: string;
  url: string;
  extractedAt: Date;
  contentHash?: string;
  metadata?: {
    publishedDate?: Date;
    author?: string;
    description?: string;
    keywords?: string[];
  };
}

export interface SummaryQualityMetrics {
  clarity: number;
  relevance: number;
  completeness: number;
  conciseness: number;
  overall: number;
}

export interface SummarizationConfig {
  openaiApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
  cacheExpiryDays: number;
  maxCacheSize: number;
  maxConcurrentRequests: number;
  costLimitPerSummary: number;
  enableQualityValidation: boolean;
  minSummaryWords: number;
  maxSummaryWords: number;
}

export interface SummarizationStats {
  totalSummaries: number;
  successfulSummaries: number;
  failedSummaries: number;
  cachedSummaries: number;
  totalCost: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  averageQualityScore: number;
}

export interface SummaryError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
}

export type SummaryPromptType = 'primary' | 'technical' | 'general' | 'fallback';

export interface PromptTemplate {
  type: SummaryPromptType;
  template: string;
  description: string;
  useCase: string[];
  maxTokens: number;
}