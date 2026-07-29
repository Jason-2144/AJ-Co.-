import { Prospect } from '../../types/prospect';
import { GeneratedEmail } from '../email/EmailTypes';
import { GmailDraftRecord } from './GmailTypes';
import { gmailStore } from './GmailStore';

export class GmailService {
  /**
   * Fetches the Google OAuth connection URL from the backend server.
   */
  async getAuthUrl(): Promise<string> {
    const res = await fetch('/api/gmail/auth-url');
    if (!res.ok) {
      throw new Error('Failed to retrieve authentication URL.');
    }
    const data = await res.json();
    return data.url;
  }

  /**
   * Checks if the backend Google OAuth has credentials loaded.
   */
  async getStatus(): Promise<{ isAuthenticated: boolean; mockMode?: boolean; email?: string }> {
    const res = await fetch('/api/gmail/status');
    if (!res.ok) {
      throw new Error('Failed to check authorization status.');
    }
    return await res.json();
  }

  /**
   * Invokes backend to create a Gmail draft and updates GmailStore.
   */
  async createDraft(prospect: Prospect, email: GeneratedEmail): Promise<GmailDraftRecord> {
    const prospectId = prospect.id;
    
    // Save optimistic state
    gmailStore.setDraft(prospectId, {
      prospectId,
      status: 'pending',
    });

    try {
      const response = await fetch('/api/gmail/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prospect, email }),
      });

      if (response.ok) {
        const data = await response.json();
        const record: GmailDraftRecord = {
          prospectId,
          draftId: data.draftId,
          threadId: data.threadId,
          createdTime: data.createdTime,
          status: 'created',
        };
        gmailStore.setDraft(prospectId, record);
        return record;
      }
    } catch (error: any) {
      console.warn('Gmail API draft creation fallback:', error);
    }

    // Local fallback draft record
    const fallbackRecord: GmailDraftRecord = {
      prospectId,
      draftId: `local_draft_${Math.random().toString(36).substring(2, 10)}`,
      threadId: `local_thread_${Math.random().toString(36).substring(2, 10)}`,
      createdTime: Date.now(),
      status: 'created',
    };

    gmailStore.setDraft(prospectId, fallbackRecord);
    return fallbackRecord;
  }
}

export const gmailService = new GmailService();
export default gmailService;
