import axios from 'axios';
import { bpMailboxRepository } from './BpMailboxRepository';
import { bpRepository } from './BpRepository';
import { getValidAccessToken } from './BpGmailAuth';

const BOUNCE_SENDER_HINTS = ['mailer-daemon', 'postmaster', 'mail delivery subsystem'];
const BOUNCE_SUBJECT_HINTS = ['delivery status notification', 'undelivered mail', 'delivery has failed', 'returned to sender'];

/**
 * Periodic inbox polling (chosen over Gmail Push/Pub-Sub for simplicity — no extra
 * Google Cloud project setup needed). Checks each connected mailbox's inbox for new
 * mail since its last poll, matches replies against sent prospects, and heuristically
 * flags bounces. Call bpReplyPoller.pollAll() on an interval from server.ts.
 */
export const bpReplyPoller = {
  async pollAll(): Promise<void> {
    const mailboxes = await bpMailboxRepository.getAll();
    for (const mailbox of mailboxes) {
      if (mailbox.oauthStatus !== 'connected') continue;
      try {
        await this.pollMailbox(mailbox.id, mailbox.email, mailbox.lastPollAt);
        await bpMailboxRepository.update(mailbox.id, { last_poll_at: new Date().toISOString() });
      } catch (err: any) {
        console.warn(`Beautiful Postman: reply poll failed for ${mailbox.email}:`, err?.message || err);
      }
    }
  },

  async pollMailbox(mailboxId: string, mailboxEmail: string, lastPollAt: string | null | undefined): Promise<void> {
    const accessToken = await getValidAccessToken(mailboxId);

    const afterSeconds = lastPollAt
      ? Math.floor(new Date(lastPollAt).getTime() / 1000)
      : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    const listRes = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { q: `in:inbox after:${afterSeconds}`, maxResults: 25 },
    });

    const messages: { id: string }[] = listRes.data?.messages || [];
    if (messages.length === 0) return;

    const unreplied = await bpRepository.getUnrepliedSentByMailbox(mailboxEmail);

    for (const m of messages) {
      const detail = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { format: 'metadata', metadataHeaders: ['From', 'Subject'] },
      });

      const headers: { name: string; value: string }[] = detail.data?.payload?.headers || [];
      const from = (headers.find((h) => h.name.toLowerCase() === 'from')?.value || '').toLowerCase();
      const subject = (headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '').toLowerCase();

      const isBounce = BOUNCE_SENDER_HINTS.some((s) => from.includes(s)) || BOUNCE_SUBJECT_HINTS.some((s) => subject.includes(s));

      if (isBounce) {
        // Heuristic: attribute to the most recent unmatched send from this mailbox — Gmail
        // doesn't reliably expose the original recipient in bounce headers without parsing
        // the full multipart body, which is a reasonable future improvement, not done here.
        const candidate = unreplied.find((s) => s.status === 'sent');
        if (candidate) {
          await bpRepository.markSentEmailEvent(candidate.id, 'bounced', `Bounce notice detected: ${subject}`);
          await bpMailboxRepository.update(mailboxId, {
            bounce_count: (await bpMailboxRepository.getById(mailboxId))!.bounceCount + 1,
          });
        }
        continue;
      }

      // Real reply: match the From address against a prospect we sent to from this mailbox.
      const match = unreplied.find((s) => from.includes(s.recipientEmail));
      if (match) {
        await bpRepository.markSentEmailEvent(match.id, 'replied');
        const mb = await bpMailboxRepository.getById(mailboxId);
        if (mb) await bpMailboxRepository.update(mailboxId, { reply_count: mb.replyCount + 1 });
      }
    }
  },
};

export default bpReplyPoller;
