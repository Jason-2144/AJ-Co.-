import { Campaign } from './CampaignTypes.js';

export class CampaignStore {
  private campaigns: Map<string, Campaign> = new Map();
  private listeners: Set<() => void> = new Set();
  private selectedCampaignId: string | null = null;

  getAll(): Campaign[] {
    return Array.from(this.campaigns.values());
  }

  get(id: string): Campaign | undefined {
    return this.campaigns.get(id);
  }

  set(id: string, campaign: Campaign): void {
    this.campaigns.set(id, campaign);
    this.notify();
  }

  delete(id: string): void {
    this.campaigns.delete(id);
    this.notify();
  }

  clear(): void {
    this.campaigns.clear();
    this.notify();
  }

  setCampaigns(campaigns: Campaign[]): void {
    this.campaigns.clear();
    campaigns.forEach((c) => this.campaigns.set(c.id, c));
    this.notify();
  }

  getSelectedCampaignId(): string | null {
    return this.selectedCampaignId;
  }

  setSelectedCampaignId(id: string | null): void {
    this.selectedCampaignId = id;
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error executing CampaignStore subscriber:', err);
      }
    });
  }
}

export const campaignStore = new CampaignStore();
export default campaignStore;
