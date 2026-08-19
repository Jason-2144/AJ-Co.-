import axios from 'axios';
import { WHATSAPP_CONFIG } from './WhatsAppConfig';

interface SendResult {
  sid: string;
  status: string;
  mock: boolean;
}

type Provider = 'meta' | 'twilio' | 'mock';

export class WhatsAppSender {
  private static instance: WhatsAppSender | null = null;

  private constructor() {}

  static getInstance(): WhatsAppSender {
    if (!WhatsAppSender.instance) {
      WhatsAppSender.instance = new WhatsAppSender();
    }
    return WhatsAppSender.instance;
  }

  /**
   * Meta's Cload API is preferred (no per-message markup, no paid-account wall
   * for templates) when configured; falls back to Twilio if only that's set;
   * falls back to mock sending when neither is configured, mirroring
   * GmailAuth's isMockMode() pattern so the feature is demoable either way.
   */
  getProvider(): Provider {
    if (process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID) return 'meta';
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) return 'twilio';
    return 'mock';
  }

  isMockMode(): boolean {
    return this.getProvider() === 'mock';
  }

  getFromNumber(): string {
    if (this.getProvider() === 'meta') {
      return process.env.META_PHONE_NUMBER_ID as string;
    }
    return process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio's public sandbox number
  }

  /**
   * WhatsApp requires every business-initiated message to reference a pre-approved
   * template — plain free text is rejected regardless of provider. Meta lets you
   * create/submit your own template for free (no paid-account wall like Twilio's
   * Content API), but it still needs to be created and approved once first.
   */
  hasApprovedTemplate(): boolean {
    if (this.getProvider() === 'meta') return !!process.env.META_TEMPLATE_NAME;
    if (this.getProvider() === 'twilio') return !!process.env.TWILIO_CONTENT_SID;
    return false;
  }

  /**
   * Sends Meta's built-in "hello_world" template — pre-approved by Meta for every
   * account with zero setup, unlike our own custom template which needs review.
   * Used purely for live demos/connectivity proof; not used by the real
   * patient re-engagement flow (fixed text, no personalization variables).
   */
  async sendTestPing(to: string): Promise<SendResult> {
    if (this.isMockMode()) {
      return {
        sid: `mock_msg_${Math.random().toString(36).substring(2, 10)}`,
        status: 'sent',
        mock: true,
      };
    }

    if (this.getProvider() !== 'meta') {
      throw new Error('The zero-setup test ping is only available on the Meta provider. Configure META_ACCESS_TOKEN / META_PHONE_NUMBER_ID to use it.');
    }

    const accessToken = process.env.META_ACCESS_TOKEN as string;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID as string;
    const toDigits = to.replace(/^whatsapp:/, '').replace(/[^\d]/g, '');

    try {
      const response = await axios.post(
        `${WHATSAPP_CONFIG.metaApiBase}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: toDigits,
          type: 'template',
          template: { name: 'hello_world', language: { code: 'en_US' } },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          timeout: WHATSAPP_CONFIG.timeout,
        }
      );

      const messageId = response.data?.messages?.[0]?.id || 'unknown';
      return { sid: messageId, status: 'sent', mock: false };
    } catch (error: any) {
      const metaError = error?.response?.data?.error?.message || error?.message || 'Unknown Meta Graph API error';
      throw new Error(`Meta WhatsApp test ping failed: ${metaError}`);
    }
  }

  async sendMessage(to: string, variables: Record<string, string>): Promise<SendResult> {
    const provider = this.getProvider();

    if (provider === 'mock') {
      return {
        sid: `mock_msg_${Math.random().toString(36).substring(2, 10)}`,
        status: 'sent',
        mock: true,
      };
    }

    if (!this.hasApprovedTemplate()) {
      const missingVar = provider === 'meta' ? 'META_TEMPLATE_NAME' : 'TWILIO_CONTENT_SID';
      throw new Error(
        `No approved WhatsApp template configured (${missingVar} is unset). WhatsApp requires every ` +
        'business-initiated message to use a pre-approved template. Create/submit one, then set that env var to its name/SID.'
      );
    }

    return provider === 'meta' ? this.sendViaMeta(to, variables) : this.sendViaTwilio(to, variables);
  }

  /**
   * Sends via Meta's WhatsApp Cloud API (Graph API) directly — no BSP middleman.
   */
  private async sendViaMeta(to: string, variables: Record<string, string>): Promise<SendResult> {
    const accessToken = process.env.META_ACCESS_TOKEN as string;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID as string;
    const templateName = process.env.META_TEMPLATE_NAME as string;
    const languageCode = process.env.META_TEMPLATE_LANGUAGE || 'en';
    const toDigits = to.replace(/^whatsapp:/, '').replace(/[^\d]/g, '');

    // Ordered by numeric key ("1", "2", ...) to match {{1}}, {{2}} template placeholders
    const orderedValues = Object.keys(variables)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => variables[key]);

    try {
      const response = await axios.post(
        `${WHATSAPP_CONFIG.metaApiBase}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: toDigits,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: 'body',
                parameters: orderedValues.map((text) => ({ type: 'text', text })),
              },
            ],
          },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          timeout: WHATSAPP_CONFIG.timeout,
        }
      );

      const messageId = response.data?.messages?.[0]?.id || 'unknown';
      return { sid: messageId, status: 'sent', mock: false };
    } catch (error: any) {
      const metaError = error?.response?.data?.error?.message || error?.message || 'Unknown Meta Graph API error';
      throw new Error(`Meta WhatsApp send failed: ${metaError}`);
    }
  }

  /**
   * Sends via Twilio's REST API using Basic Auth. Uses raw axios (no Twilio SDK
   * dependency) to match this project's existing pattern of talking to
   * third-party REST APIs directly.
   */
  private async sendViaTwilio(to: string, variables: Record<string, string>): Promise<SendResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN as string;
    const from = process.env.TWILIO_WHATSAPP_FROM as string;
    const toAddress = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const fromAddress = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

    const params = new URLSearchParams();
    params.append('To', toAddress);
    params.append('From', fromAddress);
    params.append('ContentSid', process.env.TWILIO_CONTENT_SID as string);
    params.append('ContentVariables', JSON.stringify(variables));
    const statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
    if (statusCallback) {
      params.append('StatusCallback', statusCallback);
    }

    try {
      const response = await axios.post(
        `${WHATSAPP_CONFIG.twilioApiBase}/Accounts/${accountSid}/Messages.json`,
        params,
        {
          auth: { username: accountSid, password: authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: WHATSAPP_CONFIG.timeout,
        }
      );

      return { sid: response.data.sid, status: response.data.status, mock: false };
    } catch (error: any) {
      const twilioError = error?.response?.data?.message || error?.message || 'Unknown Twilio API error';
      throw new Error(`Twilio WhatsApp send failed: ${twilioError}`);
    }
  }
}

export const whatsAppSender = WhatsAppSender.getInstance();
export default whatsAppSender;
