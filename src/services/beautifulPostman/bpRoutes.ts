import express from 'express';
import { bpRepository } from './BpRepository';
import { bpMailboxRepository } from './BpMailboxRepository';
import { bpWarmupEngine } from './BpWarmupEngine';
import { bpResearchService } from './BpResearchService';
import { bpEmailService } from './BpEmailService';
import { bpSendService } from './BpSendService';
import { bpReplyPoller } from './BpReplyPoller';
import { parseApolloCsv } from './BpCsvImport';
import { isBpGoogleConfigured, getBpAuthUrl, handleBpCallback } from './BpGmailAuth';

export const bpRouter = express.Router();

function appUrlFrom(req: express.Request): string {
  return process.env.APP_URL || `${req.protocol}://${req.headers.host}`;
}

// --- Prospects / CSV import ---
bpRouter.post('/import-csv', async (req, res) => {
  try {
    const { csvText } = req.body;
    if (!csvText) return res.status(400).send('Missing csvText.');
    const { rows, skipped, totalRows } = parseApolloCsv(csvText);
    const inserted = await bpRepository.insertProspects(rows.map((r) => ({ ...r, email: r.email, source: 'apollo_csv' })));
    res.json({ inserted, skipped, totalRows });
  } catch (err: any) {
    res.status(500).send(err?.message || 'CSV import failed.');
  }
});

bpRouter.get('/prospects', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await bpRepository.getProspects(status));
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to list prospects.');
  }
});

bpRouter.delete('/prospects', async (_req, res) => {
  try {
    await bpRepository.clearAllProspects();
    res.sendStatus(200);
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to clear prospects.');
  }
});

// --- Pipeline: research -> generate -> verify -> send, one prospect ---
bpRouter.post('/run/:prospectId', async (req, res) => {
  const { prospectId } = req.params;
  try {
    const prospect = await bpRepository.getProspect(prospectId);
    if (!prospect) return res.status(404).send('Prospect not found.');

    await bpRepository.updateProspectStatus(prospectId, 'researching');
    const research = await bpResearchService.researchProspect(prospect);

    await bpRepository.updateProspectStatus(prospectId, 'generating');
    const email = await bpEmailService.generateEmail(prospect, research);

    await bpRepository.updateProspectStatus(prospectId, 'sending');
    const result = await bpSendService.sendGeneratedEmail(prospect, email);

    res.json({
      prospect: prospect.company || prospect.email,
      recipient: prospect.email,
      subject: email.subject,
      status: result.status,
      error: result.error,
    });
  } catch (err: any) {
    await bpRepository.updateProspectStatus(prospectId, 'failed', err?.message);
    res.status(500).send(err?.message || 'Pipeline run failed.');
  }
});

// Runs the pipeline for every currently-queued prospect, sequentially, respecting mailbox
// caps (sends will simply fail with "no capacity" once every mailbox hits its daily limit
// for the day — that's the safety behaviour working as intended, not a bug).
bpRouter.post('/run-all', async (_req, res) => {
  try {
    const queued = await bpRepository.getProspects('queued');
    res.json({ started: queued.length });

    (async () => {
      for (const p of queued) {
        try {
          await bpRepository.updateProspectStatus(p.id, 'researching');
          const research = await bpResearchService.researchProspect(p);
          await bpRepository.updateProspectStatus(p.id, 'generating');
          const email = await bpEmailService.generateEmail(p, research);
          await bpRepository.updateProspectStatus(p.id, 'sending');
          await bpSendService.sendGeneratedEmail(p, email);
        } catch (err: any) {
          await bpRepository.updateProspectStatus(p.id, 'failed', err?.message);
        }
      }
    })();
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to start batch run.');
  }
});

bpRouter.get('/sent', async (_req, res) => {
  try {
    res.json(await bpRepository.getSentEmails());
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to list sent emails.');
  }
});

// --- Mailboxes ---
bpRouter.get('/mailboxes', async (_req, res) => {
  try {
    res.json(await bpMailboxRepository.getAll());
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to list mailboxes.');
  }
});

bpRouter.post('/mailboxes', async (req, res) => {
  try {
    const { email, displayName } = req.body;
    if (!email || !displayName) return res.status(400).send('Missing email or displayName.');
    const mailbox = await bpMailboxRepository.addMailbox(email, displayName);
    res.json(mailbox);
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to add mailbox.');
  }
});

bpRouter.delete('/mailboxes/:id', async (req, res) => {
  try {
    await bpMailboxRepository.remove(req.params.id);
    res.sendStatus(200);
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to remove mailbox.');
  }
});

bpRouter.post('/mailboxes/:id/toggle-pause', async (req, res) => {
  try {
    const mailbox = await bpMailboxRepository.getById(req.params.id);
    if (!mailbox) return res.status(404).send('Mailbox not found.');
    const next = mailbox.status === 'paused' ? 'healthy' : 'paused';
    res.json(await bpMailboxRepository.update(req.params.id, { status: next }));
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to toggle mailbox.');
  }
});

// --- Google OAuth for Beautiful Postman mailboxes (separate from legacy /api/gmail/*) ---
bpRouter.get('/gmail/auth-url/:mailboxId', (req, res) => {
  if (!isBpGoogleConfigured()) {
    return res.status(400).send('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set on the server yet.');
  }
  const url = getBpAuthUrl(appUrlFrom(req), req.params.mailboxId);
  res.json({ url });
});

bpRouter.get('/gmail/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state (mailbox id) parameter.');
  try {
    const { email } = await handleBpCallback(code as string, appUrlFrom(req), state as string);
    res.redirect(`/staff?tab=beautiful-postman&auth_success=true&email=${encodeURIComponent(email)}`);
  } catch (err: any) {
    res.status(500).send(`Google OAuth callback failed: ${err?.message}`);
  }
});

// --- Settings (example emails / writing notes) ---
bpRouter.get('/settings', async (_req, res) => {
  try {
    res.json(await bpRepository.getSettings());
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to load settings.');
  }
});

bpRouter.patch('/settings', async (req, res) => {
  try {
    const { exampleEmails, writingNotes } = req.body;
    res.json(await bpRepository.updateSettings(exampleEmails || [], writingNotes || ''));
  } catch (err: any) {
    res.status(500).send(err?.message || 'Failed to update settings.');
  }
});

// --- Manual trigger for reply/bounce poll + warmup day advance (also runs on an interval) ---
bpRouter.post('/poll-replies', async (_req, res) => {
  try {
    await bpReplyPoller.pollAll();
    res.sendStatus(200);
  } catch (err: any) {
    res.status(500).send(err?.message || 'Poll failed.');
  }
});

bpRouter.post('/advance-warmup', async (_req, res) => {
  try {
    const mailboxes = await bpMailboxRepository.getAll();
    for (const m of mailboxes) await bpWarmupEngine.advanceWarmupDay(m.id);
    res.sendStatus(200);
  } catch (err: any) {
    res.status(500).send(err?.message || 'Warmup advance failed.');
  }
});

/** Starts the background reply-poll loop. Call once from server.ts on boot. */
export function startBpBackgroundJobs(): void {
  const POLL_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
  setInterval(() => {
    bpReplyPoller.pollAll().catch((err) => console.warn('Beautiful Postman poll loop error:', err?.message || err));
  }, POLL_INTERVAL_MS);

  // Advance warmup day once every 24h from boot (good enough; not calendar-midnight precise).
  const DAY_MS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const mailboxes = await bpMailboxRepository.getAll();
      for (const m of mailboxes) await bpWarmupEngine.advanceWarmupDay(m.id);
    } catch (err: any) {
      console.warn('Beautiful Postman warmup advance error:', err?.message || err);
    }
  }, DAY_MS);
}

export default bpRouter;
