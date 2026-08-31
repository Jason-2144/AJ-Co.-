export type ReengagementEventType =
  | 'queue_started'
  | 'queue_paused'
  | 'queue_resumed'
  | 'queue_finished'
  | 'item_started'
  | 'item_progress'
  | 'item_stage_changed'
  | 'item_completed'
  | 'item_failed'
  | 'queue_changed';

export type ReengagementListener = (data?: any) => void;

export class ReengagementEventEmitter {
  private listeners: Record<string, Set<ReengagementListener>> = {};

  on(event: ReengagementEventType, listener: ReengagementListener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(listener);
    return () => this.off(event, listener);
  }

  off(event: ReengagementEventType, listener: ReengagementListener): void {
    if (this.listeners[event]) {
      this.listeners[event].delete(listener);
    }
  }

  emit(event: ReengagementEventType, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error executing reengagement listener for event "${event}":`, error);
        }
      });
    }
  }
}
