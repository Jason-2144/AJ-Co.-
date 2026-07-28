import { Campaign, CampaignStats } from './CampaignTypes';
import { campaignStore } from './CampaignStore';

export class CampaignService {
  async list(): Promise<Campaign[]> {
    const res = await fetch('/api/campaigns');
    if (!res.ok) {
      throw new Error('Failed to retrieve campaigns list.');
    }
    const data = await res.json();
    campaignStore.setCampaigns(data);
    return data;
  }

  async get(id: string): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve details for campaign ${id}.`);
    }
    return await res.json();
  }

  async create(campaign: Partial<Campaign>): Promise<Campaign> {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign),
    });
    if (!res.ok) {
      throw new Error('Failed to create campaign.');
    }
    const data = await res.json();
    campaignStore.set(data.id, data);
    return data;
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`Failed to update campaign ${id}.`);
    }
    const data = await res.json();
    campaignStore.set(id, data);
    return data;
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete campaign ${id}.`);
    }
    campaignStore.delete(id);
  }

  async duplicate(id: string): Promise<Campaign> {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate' }),
    });
    if (!res.ok) {
      throw new Error(`Failed to duplicate campaign ${id}.`);
    }
    const data = await res.json();
    campaignStore.set(data.id, data);
    return data;
  }

  async getStats(id: string): Promise<CampaignStats> {
    const res = await fetch(`/api/campaigns/${id}/stats`);
    if (!res.ok) {
      throw new Error(`Failed to retrieve stats for campaign ${id}.`);
    }
    return await res.json();
  }
}

export const campaignService = new CampaignService();
export default campaignService;
