export type QueueEventType =
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

export type QueueListener = (data?: any) => void;

export class QueueEventEmitter {
  private listeners: Record<string, Set<QueueListener>> = {};

  /**
   * Subscribes to a queue event. Returns an unsubscribe function.
   */
  on(event: QueueEventType, listener: QueueListener): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(listener);
    
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribes from a queue event.
   */
  off(event: QueueEventType, listener: QueueListener): void {
    if (this.listeners[event]) {
      this.listeners[event].delete(listener);
    }
  }

  /**
   * Emits an event with optional data.
   */
  emit(event: QueueEventType, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error executing queue listener for event "${event}":`, error);
        }
      });
    }
  }
}
