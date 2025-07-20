import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  SummaryQueueItem, 
  SummaryRequest, 
  SummaryResponse,
  ExtractedContent 
} from '../types/summarization';
import { SummarizationService } from './summarizationService';

const QUEUE_KEY = 'summary_queue';
const QUEUE_STATE_KEY = 'queue_state';

export interface QueueState {
  isProcessing: boolean;
  currentProcessing: string[];
  lastProcessedAt?: Date;
  totalProcessed: number;
  totalFailed: number;
}

export interface QueueProgress {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  currentlyProcessing: number;
  estimatedTimeRemaining?: number;
}

export class SummaryQueueService {
  private static instance: SummaryQueueService;
  private queue: SummaryQueueItem[] = [];
  private state: QueueState = {
    isProcessing: false,
    currentProcessing: [],
    totalProcessed: 0,
    totalFailed: 0
  };
  private summarizationService: SummarizationService;
  private progressCallbacks: ((progress: QueueProgress) => void)[] = [];
  private maxConcurrentProcessing = 3;
  private processingStartTime?: Date;

  private constructor() {
    this.summarizationService = SummarizationService.getInstance();
    this.loadQueue();
    this.loadState();
  }

  public static getInstance(): SummaryQueueService {
    if (!SummaryQueueService.instance) {
      SummaryQueueService.instance = new SummaryQueueService();
    }
    return SummaryQueueService.instance;
  }

  public async addToQueue(
    articles: ExtractedContent[],
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string[]> {
    const queueItems: SummaryQueueItem[] = articles.map(article => ({
      id: this.generateQueueId(),
      request: {
        content: article.content,
        title: article.title,
        url: article.url,
        priority
      },
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    }));

    // Insert items based on priority
    for (const item of queueItems) {
      this.insertByPriority(item);
    }

    await this.saveQueue();
    
    // Start processing if not already running
    if (!this.state.isProcessing) {
      this.startProcessing();
    }

    return queueItems.map(item => item.id);
  }

  public async addSingleToQueue(
    content: string,
    title: string,
    url: string = '',
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<string> {
    const queueItem: SummaryQueueItem = {
      id: this.generateQueueId(),
      request: {
        content,
        title,
        url,
        priority
      },
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.insertByPriority(queueItem);
    await this.saveQueue();

    if (!this.state.isProcessing) {
      this.startProcessing();
    }

    return queueItem.id;
  }

  private insertByPriority(item: SummaryQueueItem): void {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const itemPriority = priorityOrder[item.request.priority];

    let insertIndex = this.queue.length;
    
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].request.priority];
      if (itemPriority < queuePriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, item);
  }

  public async startProcessing(): Promise<void> {
    if (this.state.isProcessing) {
      return;
    }

    this.state.isProcessing = true;
    this.processingStartTime = new Date();
    await this.saveState();

    this.notifyProgress();

    try {
      while (this.hasPendingItems() && this.state.isProcessing) {
        await this.processNextBatch();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between batches
      }
    } finally {
      this.state.isProcessing = false;
      this.state.currentProcessing = [];
      this.state.lastProcessedAt = new Date();
      await this.saveState();
      this.notifyProgress();
    }
  }

  public async stopProcessing(): Promise<void> {
    this.state.isProcessing = false;
    await this.saveState();
  }

  public async pauseProcessing(): Promise<void> {
    this.state.isProcessing = false;
    await this.saveState();
    this.notifyProgress();
  }

  public async resumeProcessing(): Promise<void> {
    if (!this.hasPendingItems()) {
      return;
    }

    this.state.isProcessing = true;
    await this.saveState();
    await this.startProcessing();
  }

  private async processNextBatch(): Promise<void> {
    const availableSlots = this.maxConcurrentProcessing - this.state.currentProcessing.length;
    if (availableSlots <= 0) {
      return;
    }

    const pendingItems = this.queue
      .filter(item => item.status === 'pending')
      .slice(0, availableSlots);

    if (pendingItems.length === 0) {
      return;
    }

    const processingPromises = pendingItems.map(item => this.processQueueItem(item));
    await Promise.allSettled(processingPromises);
  }

  private async processQueueItem(item: SummaryQueueItem): Promise<void> {
    try {
      item.status = 'processing';
      item.startedAt = new Date();
      this.state.currentProcessing.push(item.id);
      
      await this.saveQueue();
      await this.saveState();
      this.notifyProgress();

      const response = await this.summarizationService.summarizeArticle(
        item.request.content,
        item.request.title,
        item.request.url,
        item.request.priority
      );

      item.status = 'completed';
      item.completedAt = new Date();
      item.response = response;
      this.state.totalProcessed++;

    } catch (error) {
      console.error(`Queue processing error for item ${item.id}:`, error);
      
      item.retryCount++;
      
      if (item.retryCount < item.maxRetries) {
        item.status = 'pending';
        item.error = undefined;
        // Move to end of queue for retry
        this.moveToEndOfQueue(item);
      } else {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        this.state.totalFailed++;
      }
    } finally {
      this.state.currentProcessing = this.state.currentProcessing.filter(id => id !== item.id);
      await this.saveQueue();
      await this.saveState();
      this.notifyProgress();
    }
  }

  private moveToEndOfQueue(item: SummaryQueueItem): void {
    const index = this.queue.findIndex(q => q.id === item.id);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.queue.push(item);
    }
  }

  public async getQueueItem(id: string): Promise<SummaryQueueItem | null> {
    return this.queue.find(item => item.id === id) || null;
  }

  public async removeFromQueue(id: string): Promise<boolean> {
    const index = this.queue.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    const item = this.queue[index];
    
    // Don't remove if currently processing
    if (item.status === 'processing') {
      return false;
    }

    this.queue.splice(index, 1);
    await this.saveQueue();
    this.notifyProgress();
    
    return true;
  }

  public async clearQueue(): Promise<void> {
    // Stop processing first
    await this.stopProcessing();
    
    // Only remove pending and failed items, keep completed ones for history
    this.queue = this.queue.filter(item => 
      item.status === 'completed' || item.status === 'processing'
    );
    
    await this.saveQueue();
    this.notifyProgress();
  }

  public async clearCompleted(): Promise<void> {
    this.queue = this.queue.filter(item => item.status !== 'completed');
    await this.saveQueue();
    this.notifyProgress();
  }

  public async retryFailed(): Promise<void> {
    const failedItems = this.queue.filter(item => item.status === 'failed');
    
    for (const item of failedItems) {
      item.status = 'pending';
      item.retryCount = 0;
      item.error = undefined;
      item.startedAt = undefined;
      item.completedAt = undefined;
      item.response = undefined;
    }

    await this.saveQueue();
    
    if (!this.state.isProcessing && failedItems.length > 0) {
      this.startProcessing();
    }
  }

  public getProgress(): QueueProgress {
    const total = this.queue.length;
    const completed = this.queue.filter(item => item.status === 'completed').length;
    const failed = this.queue.filter(item => item.status === 'failed').length;
    const pending = this.queue.filter(item => item.status === 'pending').length;
    const currentlyProcessing = this.state.currentProcessing.length;

    let estimatedTimeRemaining: number | undefined;
    
    if (this.processingStartTime && completed > 0) {
      const elapsedTime = Date.now() - this.processingStartTime.getTime();
      const avgTimePerItem = elapsedTime / completed;
      estimatedTimeRemaining = Math.round((pending + currentlyProcessing) * avgTimePerItem / 1000); // in seconds
    }

    return {
      total,
      completed,
      failed,
      pending,
      currentlyProcessing,
      estimatedTimeRemaining
    };
  }

  public getQueueState(): QueueState {
    return { ...this.state };
  }

  public getQueueItems(status?: SummaryQueueItem['status']): SummaryQueueItem[] {
    if (status) {
      return this.queue.filter(item => item.status === status);
    }
    return [...this.queue];
  }

  public onProgress(callback: (progress: QueueProgress) => void): () => void {
    this.progressCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  private notifyProgress(): void {
    const progress = this.getProgress();
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  private hasPendingItems(): boolean {
    return this.queue.some(item => item.status === 'pending');
  }

  private generateQueueId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueData) {
        const items = JSON.parse(queueData);
        this.queue = items.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          startedAt: item.startedAt ? new Date(item.startedAt) : undefined,
          completedAt: item.completedAt ? new Date(item.completedAt) : undefined
        }));
      }
    } catch (error) {
      console.error('Error loading queue:', error);
      this.queue = [];
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  }

  private async loadState(): Promise<void> {
    try {
      const stateData = await AsyncStorage.getItem(QUEUE_STATE_KEY);
      if (stateData) {
        const state = JSON.parse(stateData);
        this.state = {
          ...state,
          lastProcessedAt: state.lastProcessedAt ? new Date(state.lastProcessedAt) : undefined,
          isProcessing: false, // Always start as not processing
          currentProcessing: [] // Clear processing state on restart
        };
      }
    } catch (error) {
      console.error('Error loading queue state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STATE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving queue state:', error);
    }
  }

  public async getQueueStats(): Promise<{
    totalItemsEver: number;
    successRate: number;
    averageProcessingTime: number;
    queueSize: number;
    oldestPendingItem?: Date;
  }> {
    const totalItemsEver = this.state.totalProcessed + this.state.totalFailed;
    const successRate = totalItemsEver > 0 
      ? (this.state.totalProcessed / totalItemsEver) * 100 
      : 0;

    const completedItems = this.queue.filter(item => 
      item.status === 'completed' && item.startedAt && item.completedAt
    );
    
    const averageProcessingTime = completedItems.length > 0
      ? completedItems.reduce((sum, item) => {
          const processingTime = item.completedAt!.getTime() - item.startedAt!.getTime();
          return sum + processingTime;
        }, 0) / completedItems.length
      : 0;

    const pendingItems = this.queue.filter(item => item.status === 'pending');
    const oldestPendingItem = pendingItems.length > 0
      ? pendingItems.reduce((oldest, item) => 
          item.createdAt < oldest ? item.createdAt : oldest, 
          pendingItems[0].createdAt
        )
      : undefined;

    return {
      totalItemsEver,
      successRate,
      averageProcessingTime,
      queueSize: this.queue.length,
      oldestPendingItem
    };
  }

  public setMaxConcurrentProcessing(max: number): void {
    this.maxConcurrentProcessing = Math.max(1, Math.min(max, 10)); // Limit between 1-10
  }

  public getMaxConcurrentProcessing(): number {
    return this.maxConcurrentProcessing;
  }
}