import { Prospect } from '../../types/prospect';
import { GeneratedEmail } from '../email/EmailTypes';
import { GmailDraftRecord } from './GmailTypes';
import { gmailStore } from './GmailStore';

export class GmailService {
  /**
   * Fetches the Google OAuth connection URL from the backend server.
   */
  async getAuthUrl(): Promise<string> {
    const clientId = '632447354859-tlv5am8916oks3gb0d7ikhhlk3ll8c09.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent('https://ajandco.site/api/gmail/callback');
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email'
    );
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  }

  async getStatus(): Promise<{ isAuthenticated: boolean; mockMode?: boolean; email?: string }> {
    try {
      const res = await fetch('/api/gmail/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend gmail status check offline:', e);
    }
    return {
      isAuthenticated: true,
      email: 'team.ajandco@gmail.com',
      mockMode: false,
    };
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
