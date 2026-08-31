export interface WhatsAppMessageRecord {
  patientId: string;
  messageSid?: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied';
  mock?: boolean;
  createdTime?: number;
  lastError?: string;
}

export interface WhatsAppStatusResponse {
  provider: 'meta' | 'twilio' | 'mock';
  mockMode: boolean;
  fromNumber: string;
  hasApprovedTemplate: boolean;
}
