import { Prospect } from '../types/prospect';

export type MailboxStatus = 'healthy' | 'warming' | 'paused' | 'disabled';
export type WarmupStage = 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5' | 'graduated';
export type OAuthStatus = 'connected' | 'expired' | 'disconnected' | 'mock';
export type EmailVerificationStatus = 'valid' | 'risky' | 'invalid' | 'unverified';

export interface MailboxRecord {
  id: string;
  email: string;
  displayName: string;
  status: MailboxStatus;
  warmupDay: number;
  warmupStage: WarmupStage;
  currentDailyLimit: number;
  todaySentCount: number;
  remainingCapacity: number;
  replyCount: number;
  bounceCount: number;
  spamComplaints: number;
  healthScore: number; // 0 - 100
  googleAccountConnected: boolean;
  oauthStatus: OAuthStatus;
  lastActivity: string;
  spfStatus: 'pass' | 'fail' | 'neutral';
  dkimStatus: 'pass' | 'fail' | 'neutral';
  dmarcStatus: 'pass' | 'fail' | 'neutral';
  connectionStatus: 'online' | 'degraded' | 'offline';
  createdAt: string;
  updatedAt: string;
}

export interface WarmupProfile {
  id: string;
  name: string;
  stages: {
    dayMin: number;
    dayMax: number;
    dailyLimit: number;
    stage: WarmupStage;
  }[];
  maxBounceRatePercent: number;
  maxSpamRatePercent: number;
}

export interface MailboxPool {
  id: string;
  name: string;
  mailboxIds: string[];
  campaignIds: string[];
  createdAt: string;
}

export interface ScheduledEmailJob {
  id: string;
  campaignId: string;
  prospectId: string;
  prospectEmail: string;
  assignedMailboxId: string;
  subject: string;
  plainText: string;
  htmlText: string;
  scheduledTime: string; // ISO String
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentTime?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  email: string;
  status: EmailVerificationStatus;
  reason: string;
  syntaxValid: boolean;
  mxRecordsFound: boolean;
  isDisposable: boolean;
  isCatchAll: boolean;
  verifiedAt: string;
}

export interface DeliverabilityHealthSummary {
  overallHealthScore: number;
  totalMailboxes: number;
  healthyMailboxes: number;
  warmingMailboxes: number;
  pausedMailboxes: number;
  disabledMailboxes: number;
  globalSentToday: number;
  globalRemainingCapacity: number;
  globalBounceRate: number;
  globalReplyRate: number;
  spfPassing: number;
  dkimPassing: number;
  dmarcPassing: number;
  actionItems: string[];
}
