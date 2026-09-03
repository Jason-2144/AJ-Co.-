import { CampaignStatus } from './CampaignTypes.js';

export const CAMPAIGN_CONFIG = {
  statuses: ['Draft', 'Active', 'Paused', 'Completed', 'Archived'] as CampaignStatus[],
  defaultStatus: 'Draft' as CampaignStatus,
  itemsPerPage: 10,
};

export default CAMPAIGN_CONFIG;
