import { ReengagementStatus } from '../patients/PatientTypes.js';
import { ReengagementItem } from '../patients/PatientTypes.js';
import { reengagementStore } from './ReengagementStore.js';
import { ReengagementEventEmitter } from './ReengagementEvents.js';
import { whatsAppService } from '../whatsapp/WhatsAppService.js';
import { whatsAppStore } from '../whatsapp/WhatsAppStore.js';

export class ReengagementWorker {
  private eventEmitter: ReengagementEventEmitter;
  private checkPaused: () => Promise<void>;
  private isCancelled: (id: string) => boolean;

  constructor(
    eventEmitter: ReengagementEventEmitter,
    checkPaused: () => Promise<void>,
    isCancelled: (id: string) => boolean
  ) {
    this.eventEmitter = eventEmitter;
    this.checkPaused = checkPaused;
    this.isCancelled = isCancelled;
  }

  /**
   * Processes a single lapsed patient: AI fills the WhatsApp template's variable
   * text, then the templated message is sent via the backend Twilio route.
   */
  async processItem(item: ReengagementItem): Promise<void> {
    const itemId = item.id;

    item.startedAt = Date.now();
    item.status = ReengagementStatus.generating;
    item.currentStage = ReengagementStatus.generating;
    item.progress = 0;
    item.error = undefined;
    reengagementStore.setItem(itemId, item);

    this.eventEmitter.emit('item_started', item);
    this.eventEmitter.emit('queue_changed');

    try {
      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }
      await this.checkPaused();

      // ==========================================
      // STAGE 1: AI fills the template's nudge sentence (local Ollama)
      // ==========================================
      item.status = ReengagementStatus.generating;
      item.currentStage = ReengagementStatus.generating;
      reengagementStore.setItem(itemId, item);
      this.eventEmitter.emit('item_stage_changed', item);
      this.eventEmitter.emit('queue_changed');

      const { message, variables } = await whatsAppService.generateMessage(item.patient);
      item.generatedMessage = message;
      item.progress = 50;
      reengagementStore.setItem(itemId, item);
      this.eventEmitter.emit('item_progress', item);

      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }
      await this.checkPaused();

      // ==========================================
      // STAGE 2: Send via Twilio WhatsApp
      // ==========================================
      item.status = ReengagementStatus.sending;
      item.currentStage = ReengagementStatus.sending;
      reengagementStore.setItem(itemId, item);
      this.eventEmitter.emit('item_stage_changed', item);
      this.eventEmitter.emit('queue_changed');

      whatsAppStore.setMessage(item.patient.id, {
        patientId: item.patient.id,
        body: message,
        status: 'pending',
        createdTime: Date.now(),
      });

      const sendResult = await whatsAppService.sendMessage(item.patient, variables);
      item.messageSid = sendResult.sid;
      item.progress = 100;

      whatsAppStore.setMessage(item.patient.id, {
        patientId: item.patient.id,
        messageSid: sendResult.sid,
        body: message,
        status: 'sent',
        mock: sendResult.mock,
        createdTime: Date.now(),
      });

      if (this.isCancelled(itemId)) {
        throw new Error('Cancelled by user');
      }

      item.status = ReengagementStatus.completed;
      item.currentStage = ReengagementStatus.completed;
      item.progress = 100;
      item.finishedAt = Date.now();
      reengagementStore.setItem(itemId, item);

      this.eventEmitter.emit('item_completed', item);
      this.eventEmitter.emit('queue_changed');
    } catch (error: any) {
      item.status = ReengagementStatus.failed;
      item.currentStage = item.currentStage || ReengagementStatus.failed;
      item.finishedAt = Date.now();
      item.error = error?.message || 'Unknown reengagement queue exception';
      reengagementStore.setItem(itemId, item);

      whatsAppStore.setMessage(item.patient.id, {
        patientId: item.patient.id,
        body: item.generatedMessage || '',
        status: 'failed',
        createdTime: Date.now(),
        lastError: item.error,
      });

      this.eventEmitter.emit('item_failed', item);
      this.eventEmitter.emit('queue_changed');
    }
  }
}

export default ReengagementWorker;
