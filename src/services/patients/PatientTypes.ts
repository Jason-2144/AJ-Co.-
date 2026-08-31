export enum ReengagementStatus {
  queued = 'queued',
  generating = 'generating',
  sending = 'sending',
  completed = 'completed',
  failed = 'failed',
}

export interface Patient {
  id: string;
  name: string;
  phone: string; // E.164 format, e.g. +15551234567
  lastVisitDate?: string; // ISO date string
  clinicName?: string;
}

export interface ReengagementItem {
  id: string; // same as patient.id
  patient: Patient;
  status: ReengagementStatus;
  progress: number; // 0 to 100
  currentStage: ReengagementStatus;
  generatedMessage?: string;
  messageSid?: string;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  retryCount: number;
}

export interface PatientParsingError {
  row: number;
  rawContent: string;
  errors: string[];
}

export interface PatientParseResult {
  patients: Patient[];
  errors: PatientParsingError[];
  totalRows: number;
  validCount: number;
  skippedCount: number;
}
