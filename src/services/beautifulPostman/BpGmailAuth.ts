import axios from 'axios';
import { bpMailboxRepository } from './BpMailboxRepository.js';
import { bpWarmupEngine } from './BpWarmupEngine.js';

// Server-side only. Client secret NEVER ships to the frontend (unlike the legacy
// MultiGmailAuthManager.ts, which has a real secret hardcoded in client JS — do not
// copy that pattern). Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in server env.
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// gmail.send (not gmail.compose) is required for this agent to actually send, not just draft.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

export function isBpGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function getBpAuthUrl(appUrl: string, mailboxId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${appUrl}/api/bp/gmail/callback`;
  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent select_account',
    state: mailboxId,
  });
  return `${AUTH_URL_BASE}?${params.toString()}`;
}

export async function handleBpCallback(code: string, appUrl: string, mailboxId: string): Promise<{ email: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/bp/gmail/callback`;

  const tokenRes = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: clientId || '',
      client_secret: clientSecret || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const { access_token, refresh_token, expires_in } = tokenRes.data;
  if (!refresh_token) {
    throw new Error('Google did not return a refresh token. Revoke this app\'s access at myaccount.google.com/permissions and reconnect so Google issues a fresh consent (offline access) grant.');
  }

  const userRes = await axios.get(USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
  const email = userRes.data?.email;
  if (!email) throw new Error('Could not retrieve the connected Google account email.');

  await bpMailboxRepository.update(mailboxId, {
    access_token,
    refresh_token,
    token_expiry: Date.now() + expires_in * 1000,
    oauth_status: 'connected',
    connection_status: 'online',
    last_activity: new Date().toISOString(),
  });

  const mailbox = await bpMailboxRepository.getById(mailboxId);
  if (mailbox && mailbox.warmupDay <= 1 && mailbox.status === 'warming') {
    await bpWarmupEngine.initializeWarmup(mailboxId);
  }

  return { email };
}

/** Returns a valid access token for a mailbox, refreshing it (and persisting) if expired. */
export async function getValidAccessToken(mailboxId: string): Promise<string> {
  const mailbox = await bpMailboxRepository.getById(mailboxId);
  if (!mailbox || !mailbox.refreshToken) {
    throw new Error('Mailbox is not connected to Google. Connect it first.');
  }

  const buffer = 5 * 60 * 1000;
  if (mailbox.tokenExpiry && Date.now() + buffer < mailbox.tokenExpiry && mailbox.accessToken) {
    return mailbox.accessToken;
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const res = await axios.post(
      TOKEN_URL,
      new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        refresh_token: mailbox.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, expires_in } = res.data;
    await bpMailboxRepository.update(mailboxId, {
      access_token,
      token_expiry: Date.now() + expires_in * 1000,
      oauth_status: 'connected',
      connection_status: 'online',
    });
    return access_token;
  } catch (err: any) {
    await bpMailboxRepository.update(mailboxId, { oauth_status: 'expired', connection_status: 'offline' });
    throw new Error(`Failed to refresh Google token for ${mailbox.email}: ${err?.response?.data?.error_description || err.message}`);
  }
}
