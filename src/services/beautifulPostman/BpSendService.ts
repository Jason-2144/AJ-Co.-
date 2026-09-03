import axios from 'axios';
import { DraftFormatter } from '../gmail/DraftFormatter.js';
import { getValidAccessToken } from './BpGmailAuth.js';
import { bpRotationEngine } from './BpRotationEngine.js';
import { bpMailboxRepository } from './BpMailboxRepository.js';
import { bpRepository } from './BpRepository.js';
import { emailVerificationService } from '../mailbox/EmailVerificationService.js';
import { BpProspect, BpGeneratedEmail } from './types.js';

export const bpSendService = {
  /**
   * Mirrors the Relevance agent's steps 5-6: verify recipient, pick a mailbox via the
   * rotation engine (this is the "cycles through different inboxes" behaviour), send
   * a real Gmail message (gmail.send, not a draft), log the result either way.
   */
  async sendGeneratedEmail(prospect: BpProspect, email: BpGeneratedEmail): Promise<{ status: string; error?: string }> {
    if (!prospect.email) {
      await bpRepository.updateProspectStatus(prospect.id, 'failed', 'No recipient email address on file.');
      return { status: 'failed', error: 'No recipient email address on file.' };
    }

    const verification = await emailVerificationService.verifyEmail(prospect.email);
    if (verification.status === 'invalid') {
      await bpRepository.updateProspectStatus(prospect.id, 'failed', `Recipient failed verification: ${verification.reason}`);
      return { status: 'failed', error: `Recipient failed verification: ${verification.reason}` };
    }

    const mailbox = await bpRotationEngine.selectBestMailbox();
    if (!mailbox) {
      await bpRepository.updateProspectStatus(prospect.id, 'failed', 'No healthy mailbox with remaining daily capacity is currently connected.');
      return { status: 'failed', error: 'No healthy mailbox with remaining daily capacity is currently connected.' };
    }

    try {
      const accessToken = await getValidAccessToken(mailbox.id);
      const raw = DraftFormatter.buildMimeBase64(prospect.email, email.subject, email.bodyText, email.bodyHtml);

      const res = await axios.post(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        { raw },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );

      await bpRepository.logSentEmail({
        prospectId: prospect.id,
        generatedEmailId: email.id,
        mailboxId: mailbox.id,
        senderEmail: mailbox.email,
        recipientEmail: prospect.email,
        subject: email.subject,
        gmailMessageId: res.data?.id,
        status: 'sent',
      });

      await bpMailboxRepository.update(mailbox.id, {
        today_sent_count: mailbox.todaySentCount + 1,
        last_activity: new Date().toISOString(),
      });

      await bpRepository.updateProspectStatus(prospect.id, 'sent');
      return { status: 'sent' };
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Unknown send error';

      await bpRepository.logSentEmail({
        prospectId: prospect.id,
        generatedEmailId: email.id,
        mailboxId: mailbox.id,
        senderEmail: mailbox.email,
        recipientEmail: prospect.email,
        subject: email.subject,
        status: 'failed',
        errorMessage: errMsg,
      });

      await bpRepository.updateProspectStatus(prospect.id, 'failed', errMsg);
      return { status: 'failed', error: errMsg };
    }
  },
};

export default bpSendService;
