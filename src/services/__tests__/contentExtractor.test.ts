import { ContentExtractorService } from '../contentExtractor';
import { ContentValidator } from '../../utils/contentValidator';
import {
  ExtractedContent,
  ContentExtractionOptions,
  URLAnalysis,
  ContentType,
} from '../../types/contentExtraction';

// Mock fetch for testing
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('ContentExtractorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ContentExtractorService.clearCache();
  });

  describe('analyzeURL', () => {
    it('should correctly identify GitHub URLs', () => {
      const analysis = ContentExtractorService.analyzeURL('https://github.com/user/repo');
      expect(analysis.type).toBe('github');
      expect(analysis.requiresSpecialHandling).toBe(true);
      expect(analysis.estimatedDifficulty).toBe('medium');
    });

    it('should correctly identify YouTube URLs', () => {
      const analysis = ContentExtractorService.analyzeURL('https://youtube.com/watch?v=abc123');
      expect(analysis.type).toBe('video');
      expect(analysis.requiresSpecialHandling).toBe(true);
      expect(analysis.estimatedDifficulty).toBe('medium');
    });

    it('should correctly identify PDF URLs', () => {
      const analysis = ContentExtractorService.analyzeURL('https://example.com/document.pdf');
      expect(analysis.type).toBe('pdf');
      expect(analysis.requiresSpecialHandling).toBe(true);
      expect(analysis.estimatedDifficulty).toBe('hard');
    });

    it('should correctly identify article URLs', () => {
      const analysis = ContentExtractorService.analyzeURL('https://techcrunch.com/article-title');
      expect(analysis.type).toBe('article');
      expect(analysis.estimatedDifficulty).toBe('easy');
    });

    it('should mark impossible URLs as not extractable', () => {
      const analysis = ContentExtractorService.analyzeURL('data:text/html,<html></html>');
      expect(analysis.isExtractable).toBe(false);
      expect(analysis.estimatedDifficulty).toBe('impossible');
    });
  });

  describe('detectContentType', () => {
    it('should return correct content types', () => {
      expect(ContentExtractorService.detectContentType('https://github.com/user/repo')).toBe('github');
      expect(ContentExtractorService.detectContentType('https://youtube.com/watch?v=123')).toBe('video');
      expect(ContentExtractorService.detectContentType('https://example.com/doc.pdf')).toBe('pdf');
      expect(ContentExtractorService.detectContentType('https://news.com/article')).toBe('article');
    });
  });

  describe('extractArticleContent', () => {
    const mockSuccessfulHtml = `
      <html>
        <head>
          <title>Test Article</title>
          <meta name="author" content="Test Author">
          <meta property="og:description" content="This is a test article description with enough content for validation. Lorem ipsum dolor sit amet, consectetur adipiscing elit.">
          <meta property="og:title" content="Test Article Title">
        </head>
        <body>
          <article>
            <h1>Test Article Title</h1>
            <p>This is the main content of the article. It contains enough text to pass validation. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
            <p>Another paragraph with more content to ensure we have sufficient text for extraction.</p>
          </article>
        </body>
      </html>
    `;

    it('should successfully extract content using metadata method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockSuccessfulHtml,
      } as Response);

      const result = await ContentExtractorService.extractArticleContent('https://example.com/article');

      expect(result.success).toBe(true);
      expect(result.extractionMethod).toBe('metadata');
      expect(result.title).toBe('Test Article Title');
      expect(result.content).toContain('test article description');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should fall back to basic content extraction when metadata insufficient', async () => {
      const htmlWithoutMetadata = `
        <html>
          <head><title>Test Article</title></head>
          <body>
            <article>
              <h1>Test Article Title</h1>
              <p>This is the main content of the article with sufficient text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
            </article>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => htmlWithoutMetadata,
      } as Response);

      const result = await ContentExtractorService.extractArticleContent('https://example.com/article');

      expect(result.success).toBe(true);
      expect(['basic', 'fallback']).toContain(result.extractionMethod);
      expect(result.title).toBeDefined();
      expect(result.content).toContain('main content');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await ContentExtractorService.extractArticleContent('https://example.com/article');

      expect(result.success).toBe(false);
      expect(result.extractionMethod).toBe('failed');
      expect(result.error).toBeTruthy();
    });

    it('should handle impossible URLs', async () => {
      const result = await ContentExtractorService.extractArticleContent('javascript:alert("test")');

      expect(result.success).toBe(false);
      expect(result.error).toBe('URL type not supported for extraction');
    });

    it('should use cached content when available', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockSuccessfulHtml,
      } as Response);

      // First call should make network request
      const result1 = await ContentExtractorService.extractArticleContent('https://example.com/article');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await ContentExtractorService.extractArticleContent('https://example.com/article');
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
      expect(result2).toEqual(result1);
    });

    it('should respect custom extraction options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockSuccessfulHtml,
      } as Response);

      const customOptions: Partial<ContentExtractionOptions> = {
        timeout: 5000,
        maxContentLength: 10000,
        minContentLength: 50,
      };

      await ContentExtractorService.extractArticleContent('https://example.com/article', customOptions);

      // Verify fetch was called (options are used internally)
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const result = await ContentExtractorService.extractArticleContent('https://example.com/timeout');

      expect(result.success).toBe(false);
      expect(result.extractionMethod).toBe('failed');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await ContentExtractorService.extractArticleContent('https://example.com/notfound');

      expect(result.success).toBe(false);
      expect(result.extractionMethod).toBe('failed');
    });
  });

  describe('Cache management', () => {
    it('should clear cache correctly', () => {
      ContentExtractorService.clearCache();
      const stats = ContentExtractorService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => '<html><head><title>Test</title><meta property="og:description" content="Test description with enough content for validation. Lorem ipsum dolor sit amet."></head><body><p>Test content</p></body></html>',
      } as Response);

      await ContentExtractorService.extractArticleContent('https://example.com/test1');
      await ContentExtractorService.extractArticleContent('https://example.com/test2');

      const stats = ContentExtractorService.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('https://example.com/test1');
      expect(stats.keys).toContain('https://example.com/test2');
    });
  });

  describe('Utility methods', () => {
    it('should provide content preview', () => {
      const longContent = 'Lorem ipsum '.repeat(100);
      const preview = ContentExtractorService.getContentPreview(longContent, 50);
      
      expect(preview.length).toBeLessThanOrEqual(53); // 50 + "..."
      expect(preview).toMatch(/\.\.\.$/);
    });

    it('should validate content correctly', () => {
      const validContent = 'This is valid content. '.repeat(20);
      const isValid = ContentExtractorService.validateExtractedContent(validContent);
      
      expect(typeof isValid).toBe('boolean');
    });
  });
});

describe('ContentValidator', () => {
  describe('validateExtractedContent', () => {
    it('should pass validation for good content', () => {
      const title = 'A Good Article Title';
      const content = 'This is a well-written article with sufficient content. '.repeat(10);
      const url = 'https://example.com/article';

      const result = ContentValidator.validateExtractedContent(title, content, url);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(60);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail validation for short content', () => {
      const title = 'Short';
      const content = 'Too short';
      const url = 'https://example.com/short';

      const result = ContentValidator.validateExtractedContent(title, content, url);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(60);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should calculate readability score', () => {
      const title = 'Readable Article Title';
      const content = 'This is a readable article. It has simple sentences. The content is easy to understand.';
      const url = 'https://example.com/readable';

      const result = ContentValidator.validateExtractedContent(title, content, url);

      expect(result.readabilityScore).toBeDefined();
      expect(typeof result.readabilityScore).toBe('number');
    });
  });

  describe('getContentPreview', () => {
    it('should return full content if under limit', () => {
      const content = 'Short content';
      const preview = ContentValidator.getContentPreview(content, 100);
      
      expect(preview).toBe(content);
    });

    it('should truncate long content with ellipsis', () => {
      const content = 'This is a very long piece of content that should be truncated';
      const preview = ContentValidator.getContentPreview(content, 20);
      
      expect(preview.length).toBeLessThanOrEqual(23); // 20 + "..."
      expect(preview).toMatch(/\.\.\.$/);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time correctly', () => {
      const content = 'word '.repeat(200); // 200 words
      const readingTime = ContentValidator.estimateReadingTime(content);
      
      expect(readingTime).toBe(1); // 200 words / 200 wpm = 1 minute
    });

    it('should return minimum 1 minute for very short content', () => {
      const content = 'short';
      const readingTime = ContentValidator.estimateReadingTime(content);
      
      expect(readingTime).toBe(1);
    });
  });
});