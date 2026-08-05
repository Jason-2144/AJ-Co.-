export interface GmailDraftRecord {
  prospectId: string;
  draftId?: string;
  threadId?: string;
  senderEmail?: string;
  createdTime?: number;
  status: 'pending' | 'created' | 'failed';
  lastError?: string;
  composeUrl?: string;
}

export interface GmailAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}
