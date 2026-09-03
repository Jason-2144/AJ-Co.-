import { supabase } from '../lib/supabase.js';

export interface ClientWebsite {
  id?: string;
  client_id: string;
  domain: string;
  registrar?: string;
  hosting_provider?: string;
  dns_status: string;
  ssl_expiry?: string;
  repository_link?: string;
  deployment_platform?: string;
  search_console_status?: string;
  analytics_status?: string;
  renewal_dates?: any;
  maintenance_notes?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string;
  clients?: {
    company_name: string;
  };
}

export const websitesService = {
  async getWebsites(): Promise<ClientWebsite[]> {
    const { data, error } = await supabase
      .from('client_websites')
      .select('*, clients(company_name)')
      .is('deleted_at', null)
      .order('domain', { ascending: true });
    
    if (error) throw error;
    return data as any || [];
  },

  async createWebsite(website: Omit<ClientWebsite, 'id' | 'created_at' | 'clients'>): Promise<ClientWebsite> {
    const { data, error } = await supabase
      .from('client_websites')
      .insert(website)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateWebsite(id: string, website: Partial<ClientWebsite>): Promise<ClientWebsite> {
    const { data, error } = await supabase
      .from('client_websites')
      .update(website)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async softDeleteWebsite(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('client_websites')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', id);
    
    if (error) throw error;
  }
};
