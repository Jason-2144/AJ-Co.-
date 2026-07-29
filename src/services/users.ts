import { supabase } from '../lib/supabase';
import { UserProfile } from './auth';

export interface CompanySettings {
  id?: string;
  company_name: string;
  logo_url?: string;
  gst_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  invoice_prefix: string;
  currency: string;
  tax_rate: number;
  timezone: string;
  branding_settings?: any;
}

export interface DashboardPrefs {
  profile_id: string;
  widget_positions: any;
  hidden_widgets: any;
  sidebar_collapsed: boolean;
  layout_type: string;
}

export interface FeatureFlag {
  id?: string;
  key: string;
  name: string;
  is_enabled: boolean;
  description?: string;
}

export interface AuditLog {
  id?: string;
  user_id?: string | null;
  action: string;
  module: string;
  previous_value?: any;
  new_value?: any;
  created_at?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const usersService = {
  async getStaffProfiles(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(id, name)')
        .is('deleted_at', null)
        .order('first_name', { ascending: true });
      
      if (!error && data && data.length > 0) {
        return data as any;
      }
    } catch (err) {
      console.warn('Profiles query error:', err);
    }

    // Default fallback profiles for Jason and Amaan
    return [
      {
        id: '9609ff79-ae79-4292-9bb6-d7204aa59595',
        first_name: 'Jason',
        last_name: 'Ashish',
        email: 'jsnashish@gmail.com',
        role_id: 'owner',
        status: 'active',
        roles: { name: 'owner', role_permissions: [] }
      },
      {
        id: '75ce8abc-cd2f-4c82-90e9-47447cf7d6fa',
        first_name: 'Amaan',
        last_name: 'Abdullah',
        email: 'abdullahamaan2412@gmail.com',
        role_id: 'owner',
        status: 'active',
        roles: { name: 'owner', role_permissions: [] }
      }
    ];
  },

  async updateStaffProfile(id: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as any;
  },

  async softDeleteStaff(id: string, executorId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: executorId,
        status: 'inactive'
      })
      .eq('id', id);
    
    if (error) throw error;
  },

  async getRoles(): Promise<any[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getCompanySettings(): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', 'main')
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    const { data, error } = await supabase
      .from('company_settings')
      .upsert({ id: 'main', ...settings })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getDashboardPreferences(profileId: string): Promise<DashboardPrefs | null> {
    const { data, error } = await supabase
      .from('dashboard_preferences')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async updateDashboardPreferences(profileId: string, prefs: Omit<DashboardPrefs, 'profile_id'>): Promise<DashboardPrefs> {
    const { data, error } = await supabase
      .from('dashboard_preferences')
      .upsert({ profile_id: profileId, ...prefs })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('key', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async updateFeatureFlag(id: string, is_enabled: boolean): Promise<FeatureFlag> {
    const { data, error } = await supabase
      .from('feature_flags')
      .update({ is_enabled })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, profiles(first_name, last_name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as any || [];
  },

  async writeAuditLog(log: Omit<AuditLog, 'id' | 'created_at' | 'profiles'>): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
