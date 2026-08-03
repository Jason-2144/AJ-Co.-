import { MailboxRecord, WarmupProfile } from './MailboxTypes';

export const DEFAULT_WARMUP_PROFILE: WarmupProfile = {
  id: 'default_google_workspace_gradual',
  name: 'Google Workspace Safety Ramp-up',
  maxBounceRatePercent: 2.5,
  maxSpamRatePercent: 0.1,
  stages: [
    { dayMin: 1, dayMax: 3, dailyLimit: 10, stage: 'stage_1' },
    { dayMin: 4, dayMax: 7, dailyLimit: 15, stage: 'stage_2' },
    { dayMin: 8, dayMax: 14, dailyLimit: 20, stage: 'stage_3' },
    { dayMin: 15, dayMax: 21, dailyLimit: 30, stage: 'stage_4' },
    { dayMin: 22, dayMax: 28, dailyLimit: 40, stage: 'stage_5' },
    { dayMin: 29, dayMax: 999, dailyLimit: 50, stage: 'graduated' },
  ],
};

export const DEFAULT_MAILBOXES: MailboxRecord[] = [];
