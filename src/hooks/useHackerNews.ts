import { useState, useEffect, useCallback, useRef } from 'react';
import { hackerNewsApi } from '../services/hackerNewsApi';
import { ContentExtractorService } from '../services/contentExtractor';
import { SummarizationService } from '../services/summarizationService';
import { SummaryQueueService } from '../services/summaryQueue';
import { StoryWithDetails, ApiResponse } from '../types/hackerNews';
import { ExtractedContent } from '../types/contentExtraction';
import { SummaryResponse } from '../types/summarization';

export interface HackerNewsHookState {
  stories: StoryWithDetails[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  extractionProgress: Map<number, ExtractedContent | 'loading' | 'failed'>;
  summarizationProgress: Map<number, SummaryResponse | 'loading' | 'failed'>;
  extractionStats: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
  summarizationStats: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
  };
}

export interface HackerNewsHookActions {
  refreshStories: () => Promise<void>;
  loadMoreStories: () => Promise<void>;
  retryExtraction: (storyId: number) => Promise<void>;
  retrySummarization: (storyId: number) => Promise<void>;
  clearCache: () => void;
  getApiStats: () => any;
}

export const useHackerNews = (limit: number = 20): HackerNewsHookState & HackerNewsHookActions => {
  const [stories, setStories] = useState<StoryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<Map<number, ExtractedContent | 'loading' | 'failed'>>(new Map());
  const [summarizationProgress, setSummarizationProgress] = useState<Map<number, SummaryResponse | 'loading' | 'failed'>>(new Map());
  
  const extractionQueue = useRef<Set<number>>(new Set());
  const summarizationQueue = useRef<Set<number>>(new Set());
  const currentLimit = useRef(limit);
  const lastRefreshTime = useRef<number>(0);
  
  // Initialize AI services
  const summarizationService = useRef(SummarizationService.getInstance());
  const summaryQueueService = useRef(SummaryQueueService.getInstance());

  const updateExtractionProgress = useCallback((storyId: number, result: ExtractedContent | 'loading' | 'failed') => {
    setExtractionProgress(prev => new Map(prev.set(storyId, result)));
  }, []);

  const updateSummarizationProgress = useCallback((storyId: number, result: SummaryResponse | 'loading' | 'failed') => {
    setSummarizationProgress(prev => new Map(prev.set(storyId, result)));
  }, []);

  const summarizeContentForStory = useCallback(async (story: StoryWithDetails, extractedContent: ExtractedContent) => {
    if (!extractedContent.success || !extractedContent.content || summarizationQueue.current.has(story.id)) {
      return;
    }

    summarizationQueue.current.add(story.id);
    updateSummarizationProgress(story.id, 'loading');

    try {
      const summary = await summarizationService.current.summarizeArticle(
        extractedContent.content,
        story.title,
        story.url || '',
        'normal' // Use normal priority for regular stories
      );

      updateSummarizationProgress(story.id, summary);
    } catch (error) {
      console.warn(`AI summarization failed for story ${story.id}:`, error);
      updateSummarizationProgress(story.id, 'failed');
    } finally {
      summarizationQueue.current.delete(story.id);
    }
  }, [updateSummarizationProgress]);

  const extractContentForStory = useCallback(async (story: StoryWithDetails) => {
    if (!story.url || extractionQueue.current.has(story.id)) {
      return;
    }

    extractionQueue.current.add(story.id);
    updateExtractionProgress(story.id, 'loading');

    try {
      const content = await ContentExtractorService.extractArticleContent(story.url, {
        timeout: 8000,
        maxContentLength: 50000,
        minContentLength: 100,
      });

      updateExtractionProgress(story.id, content);
      
      // Start AI summarization if content extraction was successful
      if (content.success && content.content) {
        setTimeout(() => summarizeContentForStory(story, content), 500); // Small delay to avoid overwhelming UI
      }
    } catch (error) {
      console.warn(`Content extraction failed for story ${story.id}:`, error);
      updateExtractionProgress(story.id, 'failed');
    } finally {
      extractionQueue.current.delete(story.id);
    }
  }, [updateExtractionProgress]);

  const loadStories = useCallback(async (refresh = false, newLimit = currentLimit.current) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setError(null);
      } else {
        setLoading(true);
        setError(null);
      }

      const response: ApiResponse<StoryWithDetails[]> = await hackerNewsApi.getTopStoriesWithDetails(newLimit);
      
      if (response.success && response.data) {
        setStories(response.data);
        currentLimit.current = newLimit;
        lastRefreshTime.current = Date.now();

        // Start content extraction for stories with URLs (but don't block UI)
        const storiesWithUrls = response.data.filter(story => story.url);
        
        // Extract content for visible stories first (first 5), then continue with the rest
        const visibleStories = storiesWithUrls.slice(0, 5);
        const remainingStories = storiesWithUrls.slice(5);

        // Start visible stories immediately
        visibleStories.forEach(story => {
          setTimeout(() => extractContentForStory(story), Math.random() * 1000);
        });

        // Start remaining stories with progressive delay
        remainingStories.forEach((story, index) => {
          setTimeout(() => extractContentForStory(story), 2000 + (index * 500));
        });

      } else {
        setError(response.error || 'Failed to load stories');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stories';
      setError(errorMessage);
      console.error('Error loading stories:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [extractContentForStory]);

  const refreshStories = useCallback(async () => {
    // Prevent too frequent refreshes
    const now = Date.now();
    if (now - lastRefreshTime.current < 5000) {
      return;
    }

    // Clear extraction and summarization progress for fresh start
    setExtractionProgress(new Map());
    setSummarizationProgress(new Map());
    extractionQueue.current.clear();
    summarizationQueue.current.clear();
    
    await loadStories(true, currentLimit.current);
  }, [loadStories]);

  const loadMoreStories = useCallback(async () => {
    const newLimit = currentLimit.current + 10;
    await loadStories(false, newLimit);
  }, [loadStories]);

  const retryExtraction = useCallback(async (storyId: number) => {
    const story = stories.find(s => s.id === storyId);
    if (story && story.url) {
      await extractContentForStory(story);
    }
  }, [stories, extractContentForStory]);

  const retrySummarization = useCallback(async (storyId: number) => {
    const story = stories.find(s => s.id === storyId);
    const extractedContent = extractionProgress.get(storyId);
    
    if (story && typeof extractedContent === 'object' && extractedContent.success) {
      await summarizeContentForStory(story, extractedContent);
    }
  }, [stories, extractionProgress, summarizeContentForStory]);

  const clearCache = useCallback(() => {
    hackerNewsApi.clearCache();
    ContentExtractorService.clearCache();
    setExtractionProgress(new Map());
    setSummarizationProgress(new Map());
    extractionQueue.current.clear();
    summarizationQueue.current.clear();
  }, []);

  const getApiStats = useCallback(() => {
    return {
      hackerNews: hackerNewsApi.getStats(),
      contentExtraction: ContentExtractorService.getCacheStats(),
    };
  }, []);

  // Calculate extraction stats
  const extractionStats = {
    total: stories.filter(s => s.url).length,
    completed: Array.from(extractionProgress.values()).filter(v => typeof v === 'object' && v.success).length,
    failed: Array.from(extractionProgress.values()).filter(v => v === 'failed' || (typeof v === 'object' && !v.success)).length,
    inProgress: Array.from(extractionProgress.values()).filter(v => v === 'loading').length,
  };

  // Calculate summarization stats
  const summarizationStats = {
    total: Array.from(extractionProgress.values()).filter(v => typeof v === 'object' && v.success).length,
    completed: Array.from(summarizationProgress.values()).filter(v => typeof v === 'object' && v.summary).length,
    failed: Array.from(summarizationProgress.values()).filter(v => v === 'failed').length,
    inProgress: Array.from(summarizationProgress.values()).filter(v => v === 'loading').length,
  };

  // Initial load
  useEffect(() => {
    loadStories(false, limit);
  }, [limit]); // Only depend on limit to prevent infinite re-renders

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      extractionQueue.current.clear();
      summarizationQueue.current.clear();
    };
  }, []);

  return {
    stories,
    loading,
    refreshing,
    error,
    extractionProgress,
    summarizationProgress,
    extractionStats,
    summarizationStats,
    refreshStories,
    loadMoreStories,
    retryExtraction,
    retrySummarization,
    clearCache,
    getApiStats,
  };
};

export default useHackerNews;