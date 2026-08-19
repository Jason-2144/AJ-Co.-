import { Patient, ReengagementItem, ReengagementStatus } from '../patients/PatientTypes';
import { reengagementStore } from './ReengagementStore';
import { ReengagementEventEmitter, ReengagementListener } from './ReengagementEvents';
import { ReengagementWorker } from './ReengagementWorker';

export class ReengagementManager {
  private static instance: ReengagementManager | null = null;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private activeItemId: string | null = null;
  private cancelTokens: Set<string> = new Set();
  private pauseResolver: (() => void) | null = null;

  public eventEmitter = new ReengagementEventEmitter();

  private constructor() {}

  static getInstance(): ReengagementManager {
    if (!ReengagementManager.instance) {
      ReengagementManager.instance = new ReengagementManager();
    }
    return ReengagementManager.instance;
  }

  on(event: any, listener: ReengagementListener): () => void {
    return this.eventEmitter.on(event, listener);
  }

  enqueue(patient: Patient): void {
    const item: ReengagementItem = {
      id: patient.id,
      patient,
      status: ReengagementStatus.queued,
      progress: 0,
      currentStage: ReengagementStatus.queued,
      retryCount: 0,
    };
    reengagementStore.setItem(item.id, item);
    this.eventEmitter.emit('queue_changed');
  }

  enqueueMany(patients: Patient[]): void {
    patients.forEach((patient) => {
      const item: ReengagementItem = {
        id: patient.id,
        patient,
        status: ReengagementStatus.queued,
        progress: 0,
        currentStage: ReengagementStatus.queued,
        retryCount: 0,
      };
      reengagementStore.setItem(item.id, item);
    });
    this.eventEmitter.emit('queue_changed');
  }

  getQueue(): ReengagementItem[] {
    return reengagementStore.getItems();
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.eventEmitter.emit('queue_started');
    this.eventEmitter.emit('queue_changed');

    this.runQueueLoop();
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.eventEmitter.emit('queue_paused');
    this.eventEmitter.emit('queue_changed');
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.eventEmitter.emit('queue_resumed');
    this.eventEmitter.emit('queue_changed');

    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
    }
  }

  cancel(itemId: string): void {
    if (this.activeItemId === itemId) {
      this.cancelTokens.add(itemId);
    } else {
      const item = reengagementStore.getItem(itemId);
      if (item) {
        item.status = ReengagementStatus.failed;
        item.currentStage = ReengagementStatus.failed;
        item.progress = 0;
        item.finishedAt = Date.now();
        item.error = 'Cancelled by user';
        reengagementStore.setItem(itemId, item);

        this.eventEmitter.emit('item_failed', item);
        this.eventEmitter.emit('queue_changed');
      }
    }
  }

  retry(itemId: string): void {
    const item = reengagementStore.getItem(itemId);
    if (item) {
      item.status = ReengagementStatus.queued;
      item.currentStage = ReengagementStatus.queued;
      item.progress = 0;
      item.error = undefined;
      item.startedAt = undefined;
      item.finishedAt = undefined;
      item.retryCount += 1;
      reengagementStore.setItem(itemId, item);

      this.eventEmitter.emit('queue_changed');

      if (this.isRunning && !this.activeItemId) {
        this.isRunning = false;
        this.start();
      }
    }
  }

  clearCompleted(): void {
    reengagementStore.clearCompleted();
    this.eventEmitter.emit('queue_changed');
  }

  clearFailed(): void {
    reengagementStore.clearFailed();
    this.eventEmitter.emit('queue_changed');
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  private async checkPaused(): Promise<void> {
    if (this.isPaused) {
      return new Promise<void>((resolve) => {
        this.pauseResolver = resolve;
      });
    }
  }

  private async runQueueLoop(): Promise<void> {
    const worker = new ReengagementWorker(
      this.eventEmitter,
      () => this.checkPaused(),
      (id) => this.cancelTokens.has(id)
    );

    while (this.isRunning) {
      await this.checkPaused();

      const items = reengagementStore.getItems();
      const nextItem = items.find((item) => item.status === ReengagementStatus.queued);

      if (!nextItem) {
        this.isRunning = false;
        this.activeItemId = null;
        this.eventEmitter.emit('queue_finished');
        this.eventEmitter.emit('queue_changed');
        break;
      }

      this.activeItemId = nextItem.id;
      await worker.processItem(nextItem);

      this.activeItemId = null;
      this.cancelTokens.delete(nextItem.id);
    }
  }
}

export const reengagementManager = ReengagementManager.getInstance();
export default reengagementManager;
