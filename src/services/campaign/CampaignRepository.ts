import { supabase } from '../../lib/supabase';
import { Campaign, CampaignStatus, CampaignStats } from './CampaignTypes';

export class CampaignRepository {
  async list(): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const list = data.map(this.mapRow);
        campaignStore.setCampaigns(list);
        return list;
      }
    } catch (err) {
      console.warn('Failed to list campaigns from database, using memory store:', err);
    }
    return campaignStore.getAll();
  }

  async get(id: string): Promise<Campaign | null> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) return this.mapRow(data);
    } catch (err) {
      console.warn('Failed to get campaign from database:', err);
    }
    return campaignStore.get(id) || null;
  }

  async create(campaign: Partial<Campaign>): Promise<Campaign> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name: campaign.name,
          description: campaign.description || null,
          status: campaign.status || 'Draft',
          notes: campaign.notes || null,
        })
        .select()
        .single();

      if (!error && data) {
        const created = this.mapRow(data);
        campaignStore.set(created.id, created);
        return created;
      }
    } catch (err) {
      console.warn('Database insert fallback to memory campaign:', err);
    }

    // In-memory campaign creation fallback
    const newId = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
    const fallbackCampaign: Campaign = {
      id: newId,
      name: campaign.name || 'New Campaign',
      description: campaign.description || undefined,
      status: (campaign.status as CampaignStatus) || 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalProspects: 0,
      completedProspects: 0,
      failedProspects: 0,
      emailsGenerated: 0,
      draftsCreated: 0,
      notes: campaign.notes || undefined,
    };

    campaignStore.set(fallbackCampaign.id, fallbackCampaign);
    return fallbackCampaign;
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        name: updates.name,
        description: updates.description,
        status: updates.status,
        notes: updates.notes,
        total_prospects: updates.totalProspects,
        completed_prospects: updates.completedProspects,
        failed_prospects: updates.failedProspects,
        emails_generated: updates.emailsGenerated,
        drafts_created: updates.draftsCreated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) throw error;
  }

  async duplicate(id: string): Promise<Campaign> {
    const campaign = await this.get(id);
    if (!campaign) throw new Error('Campaign to duplicate not found.');

    // 1. Create duplicate campaign
    const duplicated = await this.create({
      name: `${campaign.name} - Copy`,
      description: campaign.description,
      status: 'Draft',
      notes: campaign.notes,
    });

    // 2. Load prospects of original campaign and insert for duplicated campaign
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('*')
      .eq('campaign_id', id);

    if (error) throw error;

    if (prospects && prospects.length > 0) {
      const newProspects = prospects.map((p) => {
        const newId = crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2));
        return {
          id: newId,
          company: p.company,
          website: p.website,
          city: p.city,
          state: p.state,
          contacts: p.contacts,
          emails: p.emails,
          status: 'queued',
          campaign_id: duplicated.id,
        };
      });

      const { error: insertErr } = await supabase.from('prospects').insert(newProspects);
      if (insertErr) throw insertErr;

      // Create matching queue items for these prospects in queued status
      const newQueueItems = newProspects.map((p) => ({
        id: p.id,
        prospect_id: p.id,
        status: 'queued',
        current_stage: 'queued',
        progress: 0,
      }));
      await supabase.from('queue_items').insert(newQueueItems);

      // Update total prospects
      await this.update(duplicated.id, { totalProspects: newProspects.length });
      duplicated.totalProspects = newProspects.length;
    }

    return duplicated;
  }

  async getStats(id: string): Promise<CampaignStats> {
    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, queue_items(status, progress), generated_emails(prospect_id), gmail_draft_records(status)')
      .eq('campaign_id', id);

    if (error) throw error;

    const stats: CampaignStats = {
      totalProspects: prospects?.length || 0,
      completedProspects: 0,
      failedProspects: 0,
      emailsGenerated: 0,
      draftsCreated: 0,
      averageProgress: 0,
    };

    if (prospects && prospects.length > 0) {
      let totalProgress = 0;
      prospects.forEach((p: any) => {
        const qi = p.queue_items;
        if (qi) {
          if (qi.status === 'completed') stats.completedProspects++;
          if (qi.status === 'failed') stats.failedProspects++;
          totalProgress += qi.progress || 0;
        }
        if (p.generated_emails) stats.emailsGenerated++;
        if (p.gmail_draft_records?.status === 'created') stats.draftsCreated++;
      });
      stats.averageProgress = Math.round(totalProgress / prospects.length);
    }

    // Sync back to database for list rendering cache
    await this.update(id, {
      totalProspects: stats.totalProspects,
      completedProspects: stats.completedProspects,
      failedProspects: stats.failedProspects,
      emailsGenerated: stats.emailsGenerated,
      draftsCreated: stats.draftsCreated,
    });

    return stats;
  }

  private mapRow(row: any): Campaign {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      status: row.status as CampaignStatus,
      createdBy: row.created_by || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalProspects: row.total_prospects,
      completedProspects: row.completed_prospects,
      failedProspects: row.failed_prospects,
      emailsGenerated: row.emails_generated,
      draftsCreated: row.drafts_created,
      notes: row.notes || undefined,
    };
  }
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;
