import AsyncStorage from '@react-native-async-storage/async-storage';
import { SummaryQueueService } from '../summaryQueue';
import { SummarizationService } from '../summarizationService';
import { ExtractedContent, SummaryQueueItem } from '../../types/summarization';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock('../summarizationService');

describe('SummaryQueueService', () => {
  let queueService: SummaryQueueService;
  let mockSummarizationService: jest.Mocked<SummarizationService>;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

  const mockArticle: ExtractedContent = {
    title: 'Test Article',
    content: 'Test content for the article',
    url: 'https://example.com/test',
    extractedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (SummaryQueueService as any).instance = undefined;
    
    // Mock AsyncStorage
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    
    // Mock SummarizationService
    mockSummarizationService = {
      summarizeArticle: jest.fn(),
      getInstance: jest.fn()
    } as any;

    (SummarizationService.getInstance as jest.Mock).mockReturnValue(mockSummarizationService);
    
    queueService = SummaryQueueService.getInstance();
  });

  describe('addToQueue', () => {
    it('should add articles to queue with correct priority order', async () => {
      const highPriorityArticle = { ...mockArticle, title: 'High Priority' };
      const normalPriorityArticle = { ...mockArticle, title: 'Normal Priority' };
      const lowPriorityArticle = { ...mockArticle, title: 'Low Priority' };

      await queueService.addToQueue([lowPriorityArticle], 'low');
      await queueService.addToQueue([normalPriorityArticle], 'normal');
      await queueService.addToQueue([highPriorityArticle], 'high');

      const queueItems = queueService.getQueueItems();
      
      expect(queueItems).toHaveLength(3);
      expect(queueItems[0].request.title).toBe('High Priority');
      expect(queueItems[1].request.title).toBe('Normal Priority');
      expect(queueItems[2].request.title).toBe('Low Priority');
    });

    it('should return queue item IDs', async () => {
      const ids = await queueService.addToQueue([mockArticle]);
      
      expect(ids).toHaveLength(1);
      expect(typeof ids[0]).toBe('string');
      expect(ids[0]).toMatch(/^queue_/);
    });

    it('should persist queue to storage', async () => {
      await queueService.addToQueue([mockArticle]);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'summary_queue',
        expect.any(String)
      );
    });

    it('should start processing automatically if not already running', async () => {
      mockSummarizationService.summarizeArticle.mockResolvedValue({
        summary: 'Test summary',
        wordCount: 2,
        confidence: 0.9,
        tokensUsed: 30,
        processingTime: 1000,
        cached: false,
        model: 'gpt-4o-mini',
        metadata: { qualityScore: 0.9, extractedDate: new Date() }
      });

      await queueService.addToQueue([mockArticle]);
      
      // Wait a bit for async processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSummarizationService.summarizeArticle).toHaveBeenCalled();
    });
  });

  describe('addSingleToQueue', () => {
    it('should add single article to queue', async () => {
      const id = await queueService.addSingleToQueue(
        mockArticle.content,
        mockArticle.title,
        mockArticle.url,
        'high'
      );

      expect(typeof id).toBe('string');
      
      const queueItems = queueService.getQueueItems();
      expect(queueItems).toHaveLength(1);
      expect(queueItems[0].request.priority).toBe('high');
    });
  });

  describe('getQueueItem', () => {
    it('should return queue item by ID', async () => {
      const ids = await queueService.addToQueue([mockArticle]);
      const item = await queueService.getQueueItem(ids[0]);
      
      expect(item).toBeDefined();
      expect(item!.id).toBe(ids[0]);
      expect(item!.request.title).toBe(mockArticle.title);
    });

    it('should return null for non-existent ID', async () => {
      const item = await queueService.getQueueItem('non-existent-id');
      expect(item).toBeNull();
    });
  });

  describe('removeFromQueue', () => {
    it('should remove pending items from queue', async () => {
      const ids = await queueService.addToQueue([mockArticle]);
      
      const removed = await queueService.removeFromQueue(ids[0]);
      
      expect(removed).toBe(true);
      expect(queueService.getQueueItems()).toHaveLength(0);
    });

    it('should not remove processing items', async () => {
      const ids = await queueService.addToQueue([mockArticle]);
      
      // Manually set item as processing
      const items = queueService.getQueueItems();
      items[0].status = 'processing';
      
      const removed = await queueService.removeFromQueue(ids[0]);
      
      expect(removed).toBe(false);
      expect(queueService.getQueueItems()).toHaveLength(1);
    });

    it('should return false for non-existent item', async () => {
      const removed = await queueService.removeFromQueue('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('clearQueue', () => {
    it('should clear all pending and failed items', async () => {
      await queueService.addToQueue([mockArticle, mockArticle]);
      
      // Manually set one as completed
      const items = queueService.getQueueItems();
      items[0].status = 'completed';
      
      await queueService.clearQueue();
      
      const remainingItems = queueService.getQueueItems();
      expect(remainingItems).toHaveLength(1);
      expect(remainingItems[0].status).toBe('completed');
    });

    it('should stop processing before clearing', async () => {
      await queueService.addToQueue([mockArticle]);
      
      await queueService.clearQueue();
      
      const state = queueService.getQueueState();
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('clearCompleted', () => {
    it('should remove only completed items', async () => {
      await queueService.addToQueue([mockArticle, mockArticle, mockArticle]);
      
      const items = queueService.getQueueItems();
      items[0].status = 'completed';
      items[1].status = 'pending';
      items[2].status = 'failed';
      
      await queueService.clearCompleted();
      
      const remainingItems = queueService.getQueueItems();
      expect(remainingItems).toHaveLength(2);
      expect(remainingItems.every(item => item.status !== 'completed')).toBe(true);
    });
  });

  describe('retryFailed', () => {
    it('should reset failed items to pending', async () => {
      await queueService.addToQueue([mockArticle]);
      
      const items = queueService.getQueueItems();
      items[0].status = 'failed';
      items[0].error = 'Test error';
      items[0].retryCount = 3;
      
      await queueService.retryFailed();
      
      const updatedItem = queueService.getQueueItems()[0];
      expect(updatedItem.status).toBe('pending');
      expect(updatedItem.error).toBeUndefined();
      expect(updatedItem.retryCount).toBe(0);
    });

    it('should start processing if items were reset', async () => {
      mockSummarizationService.summarizeArticle.mockResolvedValue({
        summary: 'Retry summary',
        wordCount: 2,
        confidence: 0.9,
        tokensUsed: 30,
        processingTime: 1000,
        cached: false,
        model: 'gpt-4o-mini',
        metadata: { qualityScore: 0.9, extractedDate: new Date() }
      });

      await queueService.addToQueue([mockArticle]);
      
      const items = queueService.getQueueItems();
      items[0].status = 'failed';
      
      await queueService.retryFailed();
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSummarizationService.summarizeArticle).toHaveBeenCalled();
    });
  });

  describe('getProgress', () => {
    it('should return accurate progress information', async () => {
      await queueService.addToQueue([mockArticle, mockArticle, mockArticle]);
      
      const items = queueService.getQueueItems();
      items[0].status = 'completed';
      items[1].status = 'pending';
      items[2].status = 'failed';
      
      const progress = queueService.getProgress();
      
      expect(progress.total).toBe(3);
      expect(progress.completed).toBe(1);
      expect(progress.failed).toBe(1);
      expect(progress.pending).toBe(1);
      expect(progress.currentlyProcessing).toBe(0);
    });

    it('should estimate time remaining when processing has started', async () => {
      // Mock the processing start time
      (queueService as any).processingStartTime = new Date(Date.now() - 10000); // 10 seconds ago
      
      await queueService.addToQueue([mockArticle, mockArticle]);
      
      const items = queueService.getQueueItems();
      items[0].status = 'completed';
      items[1].status = 'pending';
      
      const progress = queueService.getProgress();
      
      expect(progress.estimatedTimeRemaining).toBeDefined();
      expect(typeof progress.estimatedTimeRemaining).toBe('number');
    });
  });

  describe('onProgress', () => {
    it('should register and call progress callbacks', async () => {
      const progressCallback = jest.fn();
      
      const unsubscribe = queueService.onProgress(progressCallback);
      
      await queueService.addToQueue([mockArticle]);
      
      expect(progressCallback).toHaveBeenCalled();
      
      // Test unsubscribe
      unsubscribe();
      await queueService.addToQueue([mockArticle]);
      
      // Should not be called again after unsubscribe
      expect(progressCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      queueService.onProgress(errorCallback);
      
      // Should not throw when callback errors
      await expect(queueService.addToQueue([mockArticle])).resolves.toBeDefined();
    });
  });

  describe('processing flow', () => {
    it('should process items successfully', async () => {
      mockSummarizationService.summarizeArticle.mockResolvedValue({
        summary: 'Successful summary',
        wordCount: 2,
        confidence: 0.9,
        tokensUsed: 30,
        processingTime: 1000,
        cached: false,
        model: 'gpt-4o-mini',
        metadata: { qualityScore: 0.9, extractedDate: new Date() }
      });

      await queueService.addToQueue([mockArticle]);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const items = queueService.getQueueItems();
      expect(items[0].status).toBe('completed');
      expect(items[0].response).toBeDefined();
      expect(items[0].response?.summary).toBe('Successful summary');
    });

    it('should handle processing errors with retries', async () => {
      mockSummarizationService.summarizeArticle
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce({
          summary: 'Third attempt success',
          wordCount: 3,
          confidence: 0.9,
          tokensUsed: 30,
          processingTime: 1000,
          cached: false,
          model: 'gpt-4o-mini',
          metadata: { qualityScore: 0.9, extractedDate: new Date() }
        });

      await queueService.addToQueue([mockArticle]);
      
      // Wait for processing with retries
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const items = queueService.getQueueItems();
      expect(items[0].status).toBe('completed');
      expect(items[0].response?.summary).toBe('Third attempt success');
      expect(mockSummarizationService.summarizeArticle).toHaveBeenCalledTimes(3);
    });

    it('should mark items as failed after max retries', async () => {
      mockSummarizationService.summarizeArticle.mockRejectedValue(new Error('Persistent error'));

      await queueService.addToQueue([mockArticle]);
      
      // Wait for all retry attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const items = queueService.getQueueItems();
      expect(items[0].status).toBe('failed');
      expect(items[0].error).toBe('Persistent error');
      expect(items[0].retryCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume processing', async () => {
      await queueService.addToQueue([mockArticle]);
      
      await queueService.pauseProcessing();
      
      let state = queueService.getQueueState();
      expect(state.isProcessing).toBe(false);
      
      mockSummarizationService.summarizeArticle.mockResolvedValue({
        summary: 'Resumed summary',
        wordCount: 2,
        confidence: 0.9,
        tokensUsed: 30,
        processingTime: 1000,
        cached: false,
        model: 'gpt-4o-mini',
        metadata: { qualityScore: 0.9, extractedDate: new Date() }
      });

      await queueService.resumeProcessing();
      
      state = queueService.getQueueState();
      expect(state.isProcessing).toBe(true);
    });

    it('should not resume if no pending items', async () => {
      await queueService.resumeProcessing();
      
      const state = queueService.getQueueState();
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('should return comprehensive queue statistics', async () => {
      // Mock state with some processing history
      (queueService as any).state = {
        isProcessing: false,
        currentProcessing: [],
        totalProcessed: 50,
        totalFailed: 5
      };

      await queueService.addToQueue([mockArticle]);
      
      const items = queueService.getQueueItems();
      items[0].status = 'completed';
      items[0].startedAt = new Date(Date.now() - 5000);
      items[0].completedAt = new Date();
      
      const stats = await queueService.getQueueStats();
      
      expect(stats.totalItemsEver).toBe(55); // 50 + 5
      expect(stats.successRate).toBeCloseTo(90.9, 1); // 50/55 * 100
      expect(stats.queueSize).toBe(1);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('setMaxConcurrentProcessing', () => {
    it('should update max concurrent processing limit', () => {
      queueService.setMaxConcurrentProcessing(5);
      expect(queueService.getMaxConcurrentProcessing()).toBe(5);
    });

    it('should enforce reasonable limits', () => {
      queueService.setMaxConcurrentProcessing(0);
      expect(queueService.getMaxConcurrentProcessing()).toBe(1);
      
      queueService.setMaxConcurrentProcessing(20);
      expect(queueService.getMaxConcurrentProcessing()).toBe(10);
    });
  });

  describe('persistence', () => {
    it('should load queue from storage on initialization', async () => {
      const mockQueueData = [{
        id: 'test-id',
        request: {
          content: 'Test content',
          title: 'Test title',
          url: 'https://test.com',
          priority: 'normal'
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        maxRetries: 3
      }];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockQueueData));
      
      // Create new instance to test loading
      (SummaryQueueService as any).instance = undefined;
      queueService = SummaryQueueService.getInstance();
      
      // Give it time to load
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('summary_queue');
    });

    it('should handle corrupted storage data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      
      // Should not throw during initialization
      (SummaryQueueService as any).instance = undefined;
      expect(() => SummaryQueueService.getInstance()).not.toThrow();
    });
  });
});