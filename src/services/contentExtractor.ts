/**
 * React Native Compatible Content Extraction Service
 * Uses fetch API and basic HTML parsing without Node.js dependencies
 */

import {
  ExtractedContent,
  ContentExtractionOptions,
  URLAnalysis,
  ContentType,
  CachedContent,
} from '../types/contentExtraction';
import { ContentValidator } from '../utils/contentValidator';

export class ContentExtractorService {
  private static cache = new Map<string, CachedContent>();
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private static readonly DEFAULT_OPTIONS: ContentExtractionOptions = {
    timeout: 10000,
    maxContentLength: 50000,
    minContentLength: 100,
    includeImages: false,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
  };

  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  ];

  static async extractArticleContent(
    url: string,
    options: Partial<ContentExtractionOptions> = {}
  ): Promise<ExtractedContent> {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    const cachedContent = this.getCachedContent(url);
    if (cachedContent) {
      return cachedContent.content;
    }

    const analysis = this.analyzeURL(url);
    
    if (analysis.estimatedDifficulty === 'impossible') {
      return this.createFailedResult(url, 'URL type not supported for extraction');
    }

    // Try different extraction methods in order of preference
    const methods = [
      () => this.extractWithMetadata(url, mergedOptions),
      () => this.extractBasicContent(url, mergedOptions),
      () => this.extractFallback(url, mergedOptions),
    ];

    let lastError: string = '';

    for (const method of methods) {
      try {
        const result = await method();
        if (result.success) {
          this.setCachedContent(url, result);
          return result;
        }
        lastError = result.error || 'Unknown extraction error';
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        continue;
      }
    }

    const failedResult = this.createFailedResult(url, lastError);
    this.setCachedContent(url, failedResult);
    return failedResult;
  }

  private static async extractWithMetadata(
    url: string,
    options: ContentExtractionOptions
  ): Promise<ExtractedContent> {
    const response = await this.fetchWithRetry(url, options);
    const html = response;

    // Extract meta tags using regex (React Native compatible)
    const titleMatch = this.extractMetaContent(html, [
      /<meta\s+property="og:title"\s+content="([^"]*)"[^>]*>/i,
      /<meta\s+name="twitter:title"\s+content="([^"]*)"[^>]*>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const descriptionMatch = this.extractMetaContent(html, [
      /<meta\s+property="og:description"\s+content="([^"]*)"[^>]*>/i,
      /<meta\s+name="twitter:description"\s+content="([^"]*)"[^>]*>/i,
      /<meta\s+name="description"\s+content="([^"]*)"[^>]*>/i,
    ]);

    const authorMatch = this.extractMetaContent(html, [
      /<meta\s+name="author"\s+content="([^"]*)"[^>]*>/i,
      /<meta\s+property="article:author"\s+content="([^"]*)"[^>]*>/i,
    ]);

    const siteNameMatch = this.extractMetaContent(html, [
      /<meta\s+property="og:site_name"\s+content="([^"]*)"[^>]*>/i,
    ]);

    const title = titleMatch || this.extractDomain(url);
    const content = descriptionMatch || '';

    if (!content || content.length < 50) {
      return this.createFailedResult(url, 'Insufficient metadata content');
    }

    const validation = ContentValidator.validateExtractedContent(title, content, url);

    return {
      title,
      content,
      author: authorMatch || undefined,
      siteName: siteNameMatch || this.extractDomain(url),
      url,
      wordCount: validation.wordCount,
      extractionMethod: 'metadata',
      success: validation.score > 30, // Lower threshold for metadata
      error: validation.score <= 30 ? 'Low quality metadata content' : undefined,
    };
  }

  private static async extractBasicContent(
    url: string,
    options: ContentExtractionOptions
  ): Promise<ExtractedContent> {
    const response = await this.fetchWithRetry(url, options);
    const html = response;

    // Remove script and style tags
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

    const title = this.extractMetaContent(cleanHtml, [
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]) || 'Untitled';

    // Extract main content using common selectors
    const contentMatches = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*(?:content|post|article|entry)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*class="[^"]*story[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    let content = '';
    for (const regex of contentMatches) {
      const match = cleanHtml.match(regex);
      if (match && match[1]) {
        content = this.stripHtmlTags(match[1]).trim();
        if (content.length > options.minContentLength) break;
      }
    }

    // Fallback to extracting all paragraph content
    if (!content || content.length < options.minContentLength) {
      const paragraphs = this.extractAllMatches(cleanHtml, /<p[^>]*>(.*?)<\/p>/gi);
      content = paragraphs
        .map(p => this.stripHtmlTags(p).trim())
        .filter(p => p.length > 20)
        .join(' ')
        .substring(0, options.maxContentLength);
    }

    if (content.length < options.minContentLength) {
      return this.createFailedResult(url, 'Insufficient content found');
    }

    const validation = ContentValidator.validateExtractedContent(title, content, url);

    return {
      title,
      content,
      siteName: this.extractDomain(url),
      url,
      wordCount: validation.wordCount,
      extractionMethod: 'basic',
      success: validation.isValid,
      error: validation.isValid ? undefined : validation.issues.join(', '),
    };
  }

  private static async extractFallback(
    url: string,
    options: ContentExtractionOptions
  ): Promise<ExtractedContent> {
    try {
      const response = await this.fetchWithRetry(url, options);
      const title = this.extractMetaContent(response, [/<title[^>]*>([^<]+)<\/title>/i]) || this.extractDomain(url);
      
      // Try to extract first meaningful paragraph
      const firstParagraph = this.extractMetaContent(response, [/<p[^>]*>([^<]+)<\/p>/i]);
      
      if (firstParagraph && firstParagraph.length > 50) {
        return {
          title,
          content: this.stripHtmlTags(firstParagraph),
          siteName: this.extractDomain(url),
          url,
          wordCount: ContentValidator.countWords(firstParagraph),
          extractionMethod: 'fallback',
          success: true,
        };
      }
    } catch (error) {
      // Fallback failed
    }

    return {
      title: this.extractDomain(url),
      content: `Content from ${this.extractDomain(url)} - view original link`,
      siteName: this.extractDomain(url),
      url,
      wordCount: 5,
      extractionMethod: 'fallback',
      success: false,
      error: 'All extraction methods failed',
    };
  }

  private static async fetchWithRetry(
    url: string,
    options: ContentExtractionOptions,
    retries: number = 2
  ): Promise<string> {
    const userAgent = this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];

    for (let i = 0; i < retries; i++) {
      try {
        // Progressive delay
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, i * 1000));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        return text;
      } catch (error) {
        if (i === retries - 1) throw error;
      }
    }

    throw new Error('Failed to fetch after retries');
  }

  private static extractMetaContent(html: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return this.decodeHtmlEntities(match[1].trim());
      }
    }
    return null;
  }

  private static extractAllMatches(html: string, pattern: RegExp): string[] {
    const matches: string[] = [];
    let match;
    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) {
        matches.push(match[1]);
      }
    }
    return matches;
  }

  private static stripHtmlTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static decodeHtmlEntities(text: string): string {
    const entities: { [key: string]: string } = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  static analyzeURL(url: string): URLAnalysis {
    const domain = this.extractDomain(url);
    let type: ContentType = 'unknown';
    let isExtractable = true;
    let requiresSpecialHandling = false;
    let estimatedDifficulty: 'easy' | 'medium' | 'hard' | 'impossible' = 'medium';

    if (url.includes('github.com')) {
      type = 'github';
      requiresSpecialHandling = true;
      estimatedDifficulty = 'medium';
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      type = 'video';
      requiresSpecialHandling = true;
      estimatedDifficulty = 'medium';
    } else if (url.endsWith('.pdf')) {
      type = 'pdf';
      requiresSpecialHandling = true;
      estimatedDifficulty = 'hard';
    } else if (domain.includes('twitter.com') || domain.includes('linkedin.com')) {
      type = 'social';
      estimatedDifficulty = 'hard';
    } else if (domain.includes('arxiv.org') || domain.includes('doi.org')) {
      type = 'academic';
      estimatedDifficulty = 'medium';
    } else if (domain.includes('docs.') || url.includes('/docs/')) {
      type = 'documentation';
      estimatedDifficulty = 'easy';
    } else {
      type = 'article';
      estimatedDifficulty = 'easy';
    }

    // Check for impossible cases
    if (url.includes('data:') || url.includes('javascript:') || url.includes('mailto:')) {
      isExtractable = false;
      estimatedDifficulty = 'impossible';
    }

    return {
      type,
      domain,
      isExtractable,
      requiresSpecialHandling,
      estimatedDifficulty,
    };
  }

  static detectContentType(url: string): ContentType {
    return this.analyzeURL(url).type;
  }

  static getContentPreview(content: string, length: number): string {
    return ContentValidator.getContentPreview(content, length);
  }

  static validateExtractedContent(content: string): boolean {
    const validation = ContentValidator.validateExtractedContent('Test', content, 'test-url');
    return validation.isValid;
  }

  private static createFailedResult(url: string, error: string): ExtractedContent {
    const domain = this.extractDomain(url);
    return {
      title: domain,
      content: `Content from ${domain} - ${error}`,
      siteName: domain,
      url,
      wordCount: 0,
      extractionMethod: 'failed',
      success: false,
      error,
    };
  }

  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown-domain';
    }
  }

  private static getCachedContent(url: string): CachedContent | null {
    const cached = this.cache.get(url);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    if (cached) {
      this.cache.delete(url);
    }
    return null;
  }

  private static setCachedContent(url: string, content: ExtractedContent): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_DURATION);
    
    this.cache.set(url, {
      content,
      cachedAt: now,
      expiresAt,
    });

    // Simple LRU: remove oldest entries if cache gets too large
    if (this.cache.size > 500) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()).slice(0, 10), // Only return first 10 for performance
    };
  }
}