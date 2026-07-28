export interface GmailDraftRecord {
  prospectId: string;
  draftId?: string;
  threadId?: string;
  createdTime?: number;
  status: 'pending' | 'created' | 'failed';
  lastError?: string;
}

export interface GmailAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}
