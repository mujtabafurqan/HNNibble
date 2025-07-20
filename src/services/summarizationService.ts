import OpenAI from 'openai';
import { 
  SummaryRequest, 
  SummaryResponse, 
  SummaryError, 
  SummarizationConfig,
  SummaryMetadata,
  ExtractedContent,
  BatchSummaryRequest,
  BatchSummaryResponse,
  SummaryQualityMetrics
} from '../types/summarization';
import { SummaryCacheService } from './summaryCache';
import { 
  getPromptForContent, 
  formatPrompt, 
  SYSTEM_PROMPT, 
  QUALITY_CHECK_PROMPT 
} from '../constants/prompts';
import {
  OPENAI_API_KEY,
  OPENAI_MODEL,
  OPENAI_MAX_TOKENS,
  OPENAI_TEMPERATURE,
  SUMMARY_TIMEOUT_MS,
  SUMMARY_RETRY_ATTEMPTS,
  SUMMARY_CACHE_EXPIRY_DAYS,
  MAX_CACHE_SIZE,
  MAX_CONCURRENT_SUMMARIES,
  MAX_COST_PER_SUMMARY_USD,
  MIN_SUMMARY_LENGTH_WORDS,
  MAX_SUMMARY_LENGTH_WORDS,
  ENABLE_QUALITY_VALIDATION
} from '@env';

export class SummarizationService {
  private static instance: SummarizationService;
  private openai: OpenAI;
  private cache: SummaryCacheService;
  private config: SummarizationConfig;
  private activeSummaries: Map<string, Promise<SummaryResponse>> = new Map();

  private constructor() {
    this.config = this.loadConfig();
    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey,
    });
    this.cache = SummaryCacheService.getInstance();
    this.cache.setConfig(this.config.maxCacheSize, this.config.cacheExpiryDays);
  }

  public static getInstance(): SummarizationService {
    if (!SummarizationService.instance) {
      SummarizationService.instance = new SummarizationService();
    }
    return SummarizationService.instance;
  }

  private loadConfig(): SummarizationConfig {
    return {
      openaiApiKey: OPENAI_API_KEY || '',
      model: OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(OPENAI_MAX_TOKENS || '150'),
      temperature: parseFloat(OPENAI_TEMPERATURE || '0.3'),
      timeout: parseInt(SUMMARY_TIMEOUT_MS || '30000'),
      retryAttempts: parseInt(SUMMARY_RETRY_ATTEMPTS || '3'),
      cacheExpiryDays: parseInt(SUMMARY_CACHE_EXPIRY_DAYS || '7'),
      maxCacheSize: parseInt(MAX_CACHE_SIZE || '500'),
      maxConcurrentRequests: parseInt(MAX_CONCURRENT_SUMMARIES || '3'),
      costLimitPerSummary: parseFloat(MAX_COST_PER_SUMMARY_USD || '0.01'),
      enableQualityValidation: ENABLE_QUALITY_VALIDATION === 'true',
      minSummaryWords: parseInt(MIN_SUMMARY_LENGTH_WORDS || '10'),
      maxSummaryWords: parseInt(MAX_SUMMARY_LENGTH_WORDS || '100')
    };
  }

  public async summarizeArticle(
    content: string, 
    title: string,
    url: string = '',
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<SummaryResponse> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!content.trim() || !title.trim()) {
        throw new Error('Content and title are required');
      }

      if (!this.config.openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Check cache first
      const contentHash = this.cache.generateContentHash(content, title);
      const cachedSummary = await this.cache.getCachedSummary(contentHash);
      
      if (cachedSummary) {
        return cachedSummary;
      }

      // Check if summary is already in progress
      if (this.activeSummaries.has(contentHash)) {
        return await this.activeSummaries.get(contentHash)!;
      }

      // Create the summary promise
      const summaryPromise = this.performSummarization({
        content,
        title,
        url,
        priority,
        maxTokens: this.config.maxTokens,
        model: this.config.model
      }, startTime);

      this.activeSummaries.set(contentHash, summaryPromise);

      try {
        const result = await summaryPromise;
        
        // Store in cache if successful
        if (result && !result.cached) {
          await this.cache.storeSummary(
            contentHash,
            result.summary,
            result.metadata
          );
        }

        return result;
      } finally {
        this.activeSummaries.delete(contentHash);
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Summarization error:', error);
      throw this.createSummaryError(error, processingTime);
    }
  }

  private async performSummarization(
    request: SummaryRequest,
    startTime: number
  ): Promise<SummaryResponse> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await this.callOpenAI(request, startTime);
        
        if (this.config.enableQualityValidation && attempt === 1) {
          const isValid = await this.validateSummaryQuality(result.summary, request.title);
          if (!isValid && attempt < this.config.retryAttempts) {
            console.warn(`Summary quality validation failed on attempt ${attempt}, retrying...`);
            continue;
          }
        }

        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Summarization attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private async callOpenAI(request: SummaryRequest, startTime: number): Promise<SummaryResponse> {
    const prompt = getPromptForContent(request.title, request.content);
    const formattedPrompt = formatPrompt(prompt.template, request.title, request.content);
    
    // Truncate content if too long to manage costs
    const truncatedContent = this.truncateContent(request.content, 4000);
    const finalPrompt = formatPrompt(prompt.template, request.title, truncatedContent);

    const response = await Promise.race([
      this.openai.chat.completions.create({
        model: request.model || this.config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: finalPrompt }
        ],
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: this.config.temperature,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
      )
    ]);

    const summary = response.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      throw new Error('No summary generated by OpenAI');
    }

    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = this.calculateCost(tokensUsed, request.model || this.config.model);

    // Cost validation
    if (cost > this.config.costLimitPerSummary) {
      throw new Error(`Summary cost ($${cost.toFixed(4)}) exceeds limit ($${this.config.costLimitPerSummary})`);
    }

    const metadata = await this.generateSummaryMetadata(summary, request.title);
    
    return {
      summary,
      wordCount: summary.split(' ').length,
      confidence: metadata.qualityScore,
      tokensUsed,
      processingTime,
      cached: false,
      model: request.model || this.config.model,
      cost,
      metadata
    };
  }

  public async validateSummaryQuality(summary: string, title: string): Promise<boolean> {
    try {
      // Basic validation checks
      const wordCount = summary.split(' ').length;
      
      if (wordCount < this.config.minSummaryWords || wordCount > this.config.maxSummaryWords) {
        return false;
      }

      // Check for AI refusal patterns
      const refusalPatterns = [
        'I cannot', 'I\'m unable to', 'I don\'t have access',
        'As an AI', 'I\'m not able', 'Sorry, but'
      ];
      
      const lowerSummary = summary.toLowerCase();
      if (refusalPatterns.some(pattern => lowerSummary.includes(pattern.toLowerCase()))) {
        return false;
      }

      // Advanced quality check using OpenAI (optional)
      if (this.config.enableQualityValidation) {
        const qualityPrompt = formatPrompt(QUALITY_CHECK_PROMPT, title, summary);
        
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: qualityPrompt }],
          max_tokens: 10,
          temperature: 0
        });

        const scoreText = response.choices[0]?.message?.content?.trim();
        const score = parseInt(scoreText || '0');
        
        return score >= 7; // Require quality score of 7/10 or higher
      }

      return true;
    } catch (error) {
      console.warn('Quality validation error:', error);
      return true; // Don't block on validation errors
    }
  }

  private async generateSummaryMetadata(summary: string, title: string): Promise<SummaryMetadata> {
    const wordCount = summary.split(' ').length;
    
    // Simple quality scoring based on length and structure
    let qualityScore = 0.5;
    
    // Length scoring
    if (wordCount >= this.config.minSummaryWords && wordCount <= this.config.maxSummaryWords) {
      qualityScore += 0.3;
    }
    
    // Structure scoring (sentences)
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 3) {
      qualityScore += 0.2;
    }

    return {
      qualityScore: Math.min(qualityScore, 1.0),
      extractedDate: new Date().toISOString()
    };
  }

  public async getSummaryMetadata(summary: string): Promise<SummaryQualityMetrics> {
    const wordCount = summary.split(' ').length;
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      clarity: this.calculateClarity(summary),
      relevance: 0.8, // Would need content comparison for accurate relevance
      completeness: Math.min(wordCount / 50, 1.0), // Rough completeness estimate
      conciseness: Math.max(0, 1 - (wordCount - 50) / 100), // Penalty for being too long
      overall: 0.8 // Placeholder overall score
    };
  }

  private calculateClarity(summary: string): number {
    const avgWordsPerSentence = summary.split(' ').length / 
      summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Optimal range: 10-20 words per sentence
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
      return 1.0;
    } else if (avgWordsPerSentence < 10) {
      return 0.7;
    } else {
      return Math.max(0.3, 1 - (avgWordsPerSentence - 20) / 30);
    }
  }

  public async batchSummarize(request: BatchSummaryRequest): Promise<BatchSummaryResponse> {
    const startTime = Date.now();
    const results: BatchSummaryResponse['results'] = [];
    const maxConcurrent = request.maxConcurrent || this.config.maxConcurrentRequests;
    
    let successCount = 0;
    let failureCount = 0;
    let totalCost = 0;

    // Process articles in batches
    for (let i = 0; i < request.articles.length; i += maxConcurrent) {
      const batch = request.articles.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (article) => {
        const contentHash = this.cache.generateContentHash(article.content, article.title);
        
        try {
          const response = await this.summarizeArticle(
            article.content,
            article.title,
            article.url,
            request.priority
          );
          
          successCount++;
          if (response.cost) {
            totalCost += response.cost;
          }
          
          return {
            contentHash,
            response
          };
        } catch (error) {
          failureCount++;
          console.error(`Batch summarization failed for article: ${article.title}`, error);
          
          return {
            contentHash,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update progress
      if (request.progressCallback) {
        request.progressCallback(results.length, request.articles.length);
      }
    }

    return {
      results,
      totalProcessed: request.articles.length,
      successCount,
      failureCount,
      totalCost,
      processingTime: Date.now() - startTime
    };
  }

  public async retryFailedSummary(content: string, title: string): Promise<SummaryResponse> {
    // Implementation for retry with different strategy
    const fallbackRequest: SummaryRequest = {
      content: content.slice(0, 2000), // Use shorter content
      title,
      url: '',
      priority: 'low',
      model: 'gpt-4o-mini', // Use cheaper model
      maxTokens: 100 // Reduce token limit
    };

    return this.performSummarization(fallbackRequest, Date.now());
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Try to truncate at sentence boundary
    const truncated = content.slice(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.slice(0, lastSentence + 1);
    }
    
    return truncated + '...';
  }

  private calculateCost(tokensUsed: number, model: string): number {
    // Pricing as of 2024 (in USD per 1K tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    
    // Rough estimate: 70% input tokens, 30% output tokens
    const inputTokens = Math.floor(tokensUsed * 0.7);
    const outputTokens = Math.ceil(tokensUsed * 0.3);
    
    return (inputTokens * modelPricing.input + outputTokens * modelPricing.output) / 1000;
  }

  private createSummaryError(error: any, processingTime: number): SummaryError {
    let code = 'UNKNOWN_ERROR';
    let retryable = false;

    if (error?.message?.includes('timeout')) {
      code = 'TIMEOUT_ERROR';
      retryable = true;
    } else if (error?.message?.includes('rate limit')) {
      code = 'RATE_LIMIT_ERROR';
      retryable = true;
    } else if (error?.message?.includes('API key')) {
      code = 'AUTH_ERROR';
      retryable = false;
    } else if (error?.message?.includes('cost')) {
      code = 'COST_LIMIT_ERROR';
      retryable = false;
    }

    return {
      code,
      message: error?.message || 'Unknown error occurred',
      details: error,
      retryable,
      timestamp: new Date()
    };
  }

  public getConfig(): SummarizationConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<SummarizationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.cache.setConfig(this.config.maxCacheSize, this.config.cacheExpiryDays);
  }
}