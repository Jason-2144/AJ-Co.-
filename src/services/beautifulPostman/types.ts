export type BpMailboxStatus = 'healthy' | 'warming' | 'paused' | 'disabled';
export type BpOAuthStatus = 'connected' | 'expired' | 'disconnected';

export interface BpMailbox {
  id: string;
  email: string;
  displayName: string;
  status: BpMailboxStatus;
  warmupDay: number;
  warmupStage: string;
  currentDailyLimit: number;
  todaySentCount: number;
  lastSentResetDate: string;
  replyCount: number;
  bounceCount: number;
  spamComplaints: number;
  healthScore: number;
  oauthStatus: BpOAuthStatus;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: number | null;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
  connectionStatus: 'online' | 'degraded' | 'offline';
  lastActivity: string;
  lastPollAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BpProspectStatus =
  | 'queued' | 'researching' | 'generating' | 'ready' | 'sending' | 'sent' | 'failed' | 'skipped';

export interface BpProspect {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  website?: string;
  email: string;
  title?: string;
  city?: string;
  state?: string;
  source: string;
  status: BpProspectStatus;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BpGeneratedEmail {
  id: string;
  prospectId: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  hadPlaceholders: boolean;
  regenerateCount: number;
  status: 'draft' | 'sent' | 'failed';
  createdAt: string;
}

export type BpSentStatus = 'sent' | 'failed' | 'bounced' | 'replied';

export interface BpSentEmail {
  id: string;
  prospectId: string;
  generatedEmailId?: string | null;
  mailboxId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  gmailMessageId?: string | null;
  status: BpSentStatus;
  errorMessage?: string | null;
  sentAt: string;
  repliedAt?: string | null;
  bouncedAt?: string | null;
}

export interface BpSettings {
  id: string;
  exampleEmails: { subject: string; body: string }[];
  writingNotes: string;
  dailySendCapPerMailbox: number;
  updatedAt: string;
}
