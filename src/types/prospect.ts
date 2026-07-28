export enum ProspectStatus {
  queued = 'queued',
  researching = 'researching',
  analysing = 'analysing',
  generating = 'generating',
  drafting = 'drafting',
  completed = 'completed',
  failed = 'failed'
}

export interface Prospect {
  id: string;
  company: string;
  website?: string;
  city?: string;
  state?: string;
  contacts: string[];
  emails: string[];
  status: ProspectStatus;
  campaignId?: string;
}

export interface ParsingError {
  row: number;
  rawContent: string;
  errors: string[];
}

export interface ParseResult {
  prospects: Prospect[];
  errors: ParsingError[];
  totalRows: number;
  validCount: number;
  skippedCount: number;
}
