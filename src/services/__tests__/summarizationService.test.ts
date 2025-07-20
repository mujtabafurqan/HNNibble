import { SummarizationService } from '../summarizationService';
import { SummaryCacheService } from '../summaryCache';
import { SummaryRequest, SummaryResponse } from '../../types/summarization';

// Mock the dependencies
jest.mock('openai');
jest.mock('../summaryCache');
jest.mock('@env', () => ({
  OPENAI_API_KEY: 'test-api-key',
  OPENAI_MODEL: 'gpt-4o-mini',
  OPENAI_MAX_TOKENS: '150',
  OPENAI_TEMPERATURE: '0.3',
  SUMMARY_TIMEOUT_MS: '30000',
  SUMMARY_RETRY_ATTEMPTS: '3',
  SUMMARY_CACHE_EXPIRY_DAYS: '7',
  MAX_CACHE_SIZE: '500',
  MAX_CONCURRENT_SUMMARIES: '3',
  MAX_COST_PER_SUMMARY_USD: '0.01',
  MIN_SUMMARY_LENGTH_WORDS: '10',
  MAX_SUMMARY_LENGTH_WORDS: '100',
  ENABLE_QUALITY_VALIDATION: 'true'
}));

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

const mockCacheService = {
  getInstance: jest.fn(),
  setConfig: jest.fn(),
  generateContentHash: jest.fn(),
  getCachedSummary: jest.fn(),
  storeSummary: jest.fn()
};

// Mock OpenAI module
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

describe('SummarizationService', () => {
  let service: SummarizationService;
  let cacheInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    cacheInstance = {
      setConfig: jest.fn(),
      generateContentHash: jest.fn().mockReturnValue('test-hash'),
      getCachedSummary: jest.fn().mockResolvedValue(null),
      storeSummary: jest.fn().mockResolvedValue(undefined)
    };

    (SummaryCacheService.getInstance as jest.Mock).mockReturnValue(cacheInstance);
    
    // Reset singleton
    (SummarizationService as any).instance = undefined;
    service = SummarizationService.getInstance();
  });

  describe('summarizeArticle', () => {
    const mockTitle = 'Test Article Title';
    const mockContent = 'This is test content for the article that needs to be summarized.';
    const mockUrl = 'https://example.com/article';

    it('should return cached summary if available', async () => {
      const cachedResponse: SummaryResponse = {
        summary: 'Cached summary',
        wordCount: 2,
        confidence: 0.9,
        tokensUsed: 0,
        processingTime: 0,
        cached: true,
        model: 'cached',
        metadata: { qualityScore: 0.9, extractedDate: new Date() }
      };

      cacheInstance.getCachedSummary.mockResolvedValue(cachedResponse);

      const result = await service.summarizeArticle(mockContent, mockTitle, mockUrl);

      expect(result).toEqual(cachedResponse);
      expect(cacheInstance.getCachedSummary).toHaveBeenCalledWith('test-hash');
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should call OpenAI API when no cache available', async () => {
      const mockApiResponse = {
        choices: [{
          message: {
            content: 'This is a test summary of the article content.'
          }
        }],
        usage: {
          total_tokens: 50
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockApiResponse);
      cacheInstance.getCachedSummary.mockResolvedValue(null);

      const result = await service.summarizeArticle(mockContent, mockTitle, mockUrl);

      expect(result.summary).toBe('This is a test summary of the article content.');
      expect(result.cached).toBe(false);
      expect(result.tokensUsed).toBe(50);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(cacheInstance.storeSummary).toHaveBeenCalled();
    });

    it('should validate input parameters', async () => {
      await expect(service.summarizeArticle('', mockTitle)).rejects.toThrow('Content and title are required');
      await expect(service.summarizeArticle(mockContent, '')).rejects.toThrow('Content and title are required');
    });

    it('should handle API timeout errors', async () => {
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Request timeout'));

      await expect(service.summarizeArticle(mockContent, mockTitle)).rejects.toThrow('Request timeout');
    });

    it('should retry on failure up to max attempts', async () => {
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success on third try' } }],
          usage: { total_tokens: 30 }
        });

      const result = await service.summarizeArticle(mockContent, mockTitle);

      expect(result.summary).toBe('Success on third try');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    });

    it('should handle cost limit validation', async () => {
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Expensive summary' } }],
        usage: { total_tokens: 10000 } // This would be very expensive
      });

      // The service should handle high token usage gracefully
      const result = await service.summarizeArticle(mockContent, mockTitle);
      expect(result).toBeDefined();
    });
  });

  describe('validateSummaryQuality', () => {
    it('should validate summary length', async () => {
      const shortSummary = 'Too short';
      const longSummary = 'This is a very long summary that exceeds the maximum word count limit and should be rejected by the quality validation system because it is far too verbose and contains too many unnecessary words that do not add value to the summary content and make it difficult to read and understand for users who want concise information.';

      const shortResult = await service.validateSummaryQuality(shortSummary, 'Test Title');
      const longResult = await service.validateSummaryQuality(longSummary, 'Test Title');

      expect(shortResult).toBe(false);
      expect(longResult).toBe(false);
    });

    it('should detect AI refusal patterns', async () => {
      const refusalSummary = "I cannot summarize this content as it contains...";
      const normalSummary = "This article discusses new developments in technology.";

      const refusalResult = await service.validateSummaryQuality(refusalSummary, 'Test Title');
      const normalResult = await service.validateSummaryQuality(normalSummary, 'Test Title');

      expect(refusalResult).toBe(false);
      expect(normalResult).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock OpenAI call for quality check to fail
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const result = await service.validateSummaryQuality('Valid summary content here.', 'Test Title');
      
      // Should return true on validation errors (don't block on validation failures)
      expect(result).toBe(true);
    });
  });

  describe('batchSummarize', () => {
    const mockArticles = [
      {
        title: 'Article 1',
        content: 'Content 1',
        url: 'https://example.com/1',
        extractedAt: new Date()
      },
      {
        title: 'Article 2',
        content: 'Content 2',
        url: 'https://example.com/2',
        extractedAt: new Date()
      }
    ];

    it('should process multiple articles', async () => {
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Batch summary' } }],
        usage: { total_tokens: 30 }
      });

      const progressCallback = jest.fn();
      const result = await service.batchSummarize({
        articles: mockArticles,
        priority: 'normal',
        progressCallback
      });

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(progressCallback).toHaveBeenCalled();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch processing', async () => {
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success summary' } }],
          usage: { total_tokens: 30 }
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await service.batchSummarize({
        articles: mockArticles,
        priority: 'normal'
      });

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].response).toBeDefined();
      expect(result.results[1].error).toBeDefined();
    });

    it('should respect concurrent processing limits', async () => {
      const manyArticles = Array(10).fill(null).map((_, i) => ({
        title: `Article ${i}`,
        content: `Content ${i}`,
        url: `https://example.com/${i}`,
        extractedAt: new Date()
      }));

      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Concurrent summary' } }],
        usage: { total_tokens: 30 }
      });

      const result = await service.batchSummarize({
        articles: manyArticles,
        priority: 'normal',
        maxConcurrent: 3
      });

      expect(result.totalProcessed).toBe(10);
      expect(result.successCount).toBe(10);
    });
  });

  describe('getSummaryMetadata', () => {
    it('should generate quality metrics', async () => {
      const summary = 'This is a well-written summary. It contains clear information.';
      
      const metadata = await service.getSummaryMetadata(summary);

      expect(metadata).toHaveProperty('clarity');
      expect(metadata).toHaveProperty('relevance');
      expect(metadata).toHaveProperty('completeness');
      expect(metadata).toHaveProperty('conciseness');
      expect(metadata).toHaveProperty('overall');
      expect(metadata.clarity).toBeGreaterThan(0);
      expect(metadata.clarity).toBeLessThanOrEqual(1);
    });
  });

  describe('retryFailedSummary', () => {
    it('should use fallback parameters for retry', async () => {
      const mockContent = 'Test content for retry';
      const mockTitle = 'Test title for retry';
      
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Retry summary' } }],
        usage: { total_tokens: 25 }
      });

      const result = await service.retryFailedSummary(mockContent, mockTitle);

      expect(result.summary).toBe('Retry summary');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          max_tokens: 100
        })
      );
    });
  });

  describe('config management', () => {
    it('should return current config', () => {
      const config = service.getConfig();
      
      expect(config).toHaveProperty('openaiApiKey');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('maxTokens');
      expect(config.model).toBe('gpt-4o-mini');
    });

    it('should update config', () => {
      const updates = {
        maxTokens: 200,
        temperature: 0.5
      };

      service.updateConfig(updates);
      const newConfig = service.getConfig();

      expect(newConfig.maxTokens).toBe(200);
      expect(newConfig.temperature).toBe(0.5);
    });
  });

  describe('error handling', () => {
    it('should create appropriate error objects', async () => {
      const mockContent = 'Test content for error';
      const mockTitle = 'Test title for error';
      
      cacheInstance.getCachedSummary.mockResolvedValue(null);
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('timeout error'));

      try {
        await service.summarizeArticle(mockContent, mockTitle);
      } catch (error: any) {
        expect(error).toHaveProperty('message');
        expect(error.message).toContain('timeout error');
      }
    });

    it('should handle missing API key', async () => {
      const mockContent = 'Test content for API key error';
      const mockTitle = 'Test title for API key error';
      
      // Create a new service instance with no API key
      service.updateConfig({ openaiApiKey: '' });

      await expect(service.summarizeArticle(mockContent, mockTitle))
        .rejects.toThrow('OpenAI API key not configured');
    });
  });
});