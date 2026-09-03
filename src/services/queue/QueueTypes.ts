import { Prospect, ProspectStatus } from '../../types/prospect.js';

export interface QueueItem {
  id: string; // Same as prospect.id
  prospect: Prospect;
  status: ProspectStatus;
  progress: number; // 0 to 100
  currentStage: ProspectStatus;
  startedAt?: number; // Epoch timestamp
  finishedAt?: number; // Epoch timestamp
  error?: string;
  retryCount: number;
}
