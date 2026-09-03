import { Prospect, ProspectStatus } from '../../types/prospect.js';
import { QueueItem } from './QueueTypes.js';
import { queueStore } from './QueueStore.js';
import { QueueEventEmitter, QueueListener } from './QueueEvents.js';
import { QueueWorker } from './QueueWorker.js';

export class QueueManager {
  private static instance: QueueManager | null = null;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private activeItemId: string | null = null;
  private cancelTokens: Set<string> = new Set();
  private pauseResolver: (() => void) | null = null;
  private campaignFilterId: string | null = null;
  
  public eventEmitter = new QueueEventEmitter();

  private constructor() {}

  /**
   * Singleton accessor for global queue management.
   */
  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Subscribes to queue state change events.
   */
  on(event: any, listener: QueueListener): () => void {
    return this.eventEmitter.on(event, listener);
  }

  /**
   * Converts a Prospect object into a QueueItem and enqueues it.
   */
  enqueue(prospect: Prospect): void {
    const item: QueueItem = {
      id: prospect.id,
      prospect,
      status: ProspectStatus.queued,
      progress: 0,
      currentStage: ProspectStatus.queued,
      retryCount: 0,
    };
    queueStore.setItem(item.id, item);
    this.eventEmitter.emit('queue_changed');
  }

  /**
   * Enqueues multiple prospects at once.
   */
  enqueueMany(prospects: Prospect[]): void {
    prospects.forEach((prospect) => {
      const item: QueueItem = {
        id: prospect.id,
        prospect,
        status: ProspectStatus.queued,
        progress: 0,
        currentStage: ProspectStatus.queued,
        retryCount: 0,
      };
      queueStore.setItem(item.id, item);
    });
    this.eventEmitter.emit('queue_changed');
  }

  /**
   * Returns all items in the queue store.
   */
  getQueue(): QueueItem[] {
    return queueStore.getItems();
  }

  /**
   * Gets the active item ID being processed, if any.
   */
  getCurrentItem(): QueueItem | null {
    if (!this.activeItemId) return null;
    return queueStore.getItem(this.activeItemId) || null;
  }

  /**
   * Starts processing queued items in the background.
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.eventEmitter.emit('queue_started');
    this.eventEmitter.emit('queue_changed');

    // Launch worker loop in background
    this.runQueueLoop();
  }

  /**
   * Pauses queue worker execution.
   */
  pause(): void {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    this.eventEmitter.emit('queue_paused');
    this.eventEmitter.emit('queue_changed');
  }

  /**
   * Resumes queue worker execution.
   */
  resume(): void {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this.eventEmitter.emit('queue_resumed');
    this.eventEmitter.emit('queue_changed');

    // Trigger pause resolver to resume the worker promise
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  /**
   * Cancels a specific queue item by ID.
   */
  cancel(itemId: string): void {
    if (this.activeItemId === itemId) {
      // Active item: flag for cancellation in sub-ticks
      this.cancelTokens.add(itemId);
    } else {
      // Inactive/queued item: set state directly
      const item = queueStore.getItem(itemId);
      if (item) {
        item.status = ProspectStatus.failed;
        item.currentStage = ProspectStatus.failed;
        item.progress = 0;
        item.finishedAt = Date.now();
        item.error = 'Cancelled by user';
        queueStore.setItem(itemId, item);
        
        this.eventEmitter.emit('item_failed', item);
        this.eventEmitter.emit('queue_changed');
      }
    }
  }

  /**
   * Retries a failed or cancelled queue item.
   */
  retry(itemId: string): void {
    const item = queueStore.getItem(itemId);
    if (item) {
      item.status = ProspectStatus.queued;
      item.currentStage = ProspectStatus.queued;
      item.progress = 0;
      item.error = undefined;
      item.startedAt = undefined;
      item.finishedAt = undefined;
      item.retryCount += 1;
      queueStore.setItem(itemId, item);
      
      this.eventEmitter.emit('queue_changed');

      // Auto-restart loop if manager is in a running state but completed earlier
      if (this.isRunning && !this.activeItemId) {
        // If the loop finished earlier, restart it
        this.isRunning = false;
        this.start();
      }
    }
  }

  /**
   * Cleans up successfully completed items.
   */
  clearCompleted(): void {
    queueStore.clearCompleted();
    this.eventEmitter.emit('queue_changed');
  }

  /**
   * Cleans up failed/cancelled items.
   */
  clearFailed(): void {
    queueStore.clearFailed();
    this.eventEmitter.emit('queue_changed');
  }

  /**
   * Checks if queue manager is running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Checks if queue manager is paused.
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Pauses workers at a check-point by returning a blocking promise if paused.
   */
  private async checkPaused(): Promise<void> {
    if (this.isPaused) {
      return new Promise<void>((resolve) => {
        this.pauseResolver = resolve;
      });
    }
  }

  /**
   * Core sequential queue execution loop.
   */
  private async runQueueLoop(): Promise<void> {
    const worker = new QueueWorker(
      this.eventEmitter,
      () => this.checkPaused(),
      (id) => this.cancelTokens.has(id)
    );

    while (this.isRunning) {
      await this.checkPaused();

      // Retrieve first item with queued status, filtered by campaign if set
      const items = queueStore.getItems();
      const nextItem = items.find((item) => 
        item.status === ProspectStatus.queued &&
        (!this.campaignFilterId || item.prospect.campaignId === this.campaignFilterId)
      );

      if (!nextItem) {
        // Queue finished processing
        this.isRunning = false;
        this.activeItemId = null;
        this.eventEmitter.emit('queue_finished');
        this.eventEmitter.emit('queue_changed');
        break;
      }

      // Execute worker steps on active item
      this.activeItemId = nextItem.id;
      await worker.processItem(nextItem);

      // Clean up cancel state
      this.activeItemId = null;
      this.cancelTokens.delete(nextItem.id);
    }
  }

  setCampaignFilter(campaignId: string | null): void {
    this.campaignFilterId = campaignId;
  }

  getCampaignFilter(): string | null {
    return this.campaignFilterId;
  }

  retryCampaignFailed(campaignId: string): void {
    const items = queueStore.getItems();
    items.forEach((item) => {
      if (item.prospect.campaignId === campaignId && item.status === ProspectStatus.failed) {
        this.retry(item.id);
      }
    });
  }

  cancelCampaignRemaining(campaignId: string): void {
    const items = queueStore.getItems();
    items.forEach((item) => {
      if (item.prospect.campaignId === campaignId && 
          (item.status === ProspectStatus.queued || 
           [ProspectStatus.researching, ProspectStatus.analysing, ProspectStatus.generating, ProspectStatus.drafting].includes(item.status))) {
        this.cancel(item.id);
      }
    });
  }
}

export const queueManager = QueueManager.getInstance();
export default queueManager;
