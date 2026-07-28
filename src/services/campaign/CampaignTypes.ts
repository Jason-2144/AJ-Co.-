export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  totalProspects: number;
  completedProspects: number;
  failedProspects: number;
  emailsGenerated: number;
  draftsCreated: number;
  notes?: string;
}

export interface CampaignStats {
  totalProspects: number;
  completedProspects: number;
  failedProspects: number;
  emailsGenerated: number;
  draftsCreated: number;
  averageProgress: number;
}
