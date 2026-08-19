import { Patient } from '../patients/PatientTypes';
import { WhatsAppStatusResponse } from './WhatsAppTypes';

export class WhatsAppService {
  /**
   * Asks the backend to generate the AI nudge sentence and fill the WhatsApp template.
   * Returns both a display-ready message string and the raw {{1}}/{{2}} template
   * variables — WhatsApp sends require the variables, not the assembled text.
   */
  async generateMessage(patient: Patient): Promise<{ message: string; variables: Record<string, string> }> {
    const response = await fetch('/api/whatsapp/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient }),
    });

    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to generate WhatsApp message.');
    }

    return response.json();
  }

  /**
   * Sends the approved template (filled with variables) to the patient's WhatsApp
   * number via the backend Twilio route.
   */
  async sendMessage(patient: Patient, variables: Record<string, string>): Promise<{ sid: string; status: string; mock: boolean }> {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: patient.phone, variables }),
    });

    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to send WhatsApp message.');
    }

    return response.json();
  }

  /**
   * Sends Meta's zero-setup "hello_world" template directly to a phone number —
   * for live demos/connectivity proof, independent of our own template's approval status.
   */
  async sendTestPing(phone: string): Promise<{ sid: string; status: string; mock: boolean }> {
    const response = await fetch('/api/whatsapp/test-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone }),
    });

    if (!response.ok) {
      throw new Error(await response.text() || 'Failed to send test message.');
    }

    return response.json();
  }

  async getStatus(): Promise<WhatsAppStatusResponse> {
    const response = await fetch('/api/whatsapp/status');
    if (!response.ok) {
      throw new Error('Failed to fetch WhatsApp connection status.');
    }
    return response.json();
  }
}

export const whatsAppService = new WhatsAppService();
export default whatsAppService;
