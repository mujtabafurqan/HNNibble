export interface ExtractedContent {
  title: string;
  content: string;
  author?: string;
  publishDate?: Date;
  siteName?: string;
  url: string;
  wordCount: number;
  extractionMethod: 'readability' | 'custom' | 'basic' | 'metadata' | 'fallback' | 'failed';
  success: boolean;
  error?: string;
}

export interface ContentExtractionOptions {
  timeout: number;
  maxContentLength: number;
  minContentLength: number;
  includeImages: boolean;
  userAgent: string;
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishDate?: string;
  siteName?: string;
  image?: string;
  url: string;
}

export interface ContentValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  wordCount: number;
  readabilityScore?: number;
}

export interface SpecializedContentHandler {
  canHandle: (url: string) => boolean;
  extract: (url: string, options: ContentExtractionOptions) => Promise<ExtractedContent>;
}

export interface ExtractionStats {
  totalAttempts: number;
  successfulExtractions: number;
  failedExtractions: number;
  successRate: number;
  averageExtractionTime: number;
  methodStats: {
    readability: number;
    custom: number;
    basic: number;
    metadata: number;
    fallback: number;
    failed: number;
  };
}

export interface CachedContent {
  content: ExtractedContent;
  cachedAt: Date;
  expiresAt: Date;
}

export type ContentType = 
  | 'article'
  | 'github'
  | 'pdf'
  | 'video'
  | 'social'
  | 'academic'
  | 'documentation'
  | 'unknown';

export interface URLAnalysis {
  type: ContentType;
  domain: string;
  isExtractable: boolean;
  requiresSpecialHandling: boolean;
  estimatedDifficulty: 'easy' | 'medium' | 'hard' | 'impossible';
}