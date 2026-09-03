import { supabase } from '../lib/supabase.js';
import { UserProfile } from './auth.js';

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

const SETTINGS_STORAGE_KEY = 'ajco_crm_settings';
const LOGS_STORAGE_KEY = 'ajco_crm_audit_logs';

function getLocalStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to write to local storage ${key}`, e);
  }
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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data as any;
    } catch (err) {}
    return { id, first_name: '', last_name: '', email: '', role_id: '', status: 'active', ...profile } as any;
  },

  async softDeleteStaff(id: string, executorId: string): Promise<void> {
    try {
      await supabase
        .from('profiles')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: executorId,
          status: 'inactive'
        })
        .eq('id', id);
    } catch (err) {}
  },

  async getRoles(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });
      
      if (!error && data) return data;
    } catch (err) {}
    return [
      { id: 'owner', name: 'owner', description: 'Full unrestricted owner control' },
      { id: 'admin', name: 'admin', description: 'Admin permissions control' },
      { id: 'manager', name: 'manager', description: 'Manager level access' },
      { id: 'staff', name: 'staff', description: 'Standard access' }
    ];
  },

  async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();
      
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<CompanySettings>(SETTINGS_STORAGE_KEY);
    return local[0] || {
      company_name: 'AJ & Co.',
      invoice_prefix: 'INV-',
      currency: 'INR',
      tax_rate: 18,
      timezone: 'Asia/Kolkata'
    };
  },

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    const updated: CompanySettings = {
      company_name: 'AJ & Co.',
      invoice_prefix: 'INV-',
      currency: 'USD',
      tax_rate: 20,
      timezone: 'Europe/London',
      ...settings,
      id: 'main'
    };

    try {
      const { data, error } = await supabase
        .from('company_settings')
        .upsert({ id: 'main', ...settings })
        .select()
        .single();
      
      if (!error && data) {
        setLocalStore(SETTINGS_STORAGE_KEY, [data]);
        return data;
      }
    } catch (err) {}

    setLocalStore(SETTINGS_STORAGE_KEY, [updated]);
    return updated;
  },

  async getDashboardPreferences(profileId: string): Promise<DashboardPrefs | null> {
    try {
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();
      
      if (!error && data) return data;
    } catch (err) {}
    return null;
  },

  async updateDashboardPreferences(profileId: string, prefs: Omit<DashboardPrefs, 'profile_id'>): Promise<DashboardPrefs> {
    const newPrefs = { profile_id: profileId, ...prefs };
    try {
      const { data, error } = await supabase
        .from('dashboard_preferences')
        .upsert(newPrefs)
        .select()
        .single();
      
      if (!error && data) return data;
    } catch (err) {}
    return newPrefs;
  },

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('key', { ascending: true });
      
      if (!error && data) return data;
    } catch (err) {}
    return [];
  },

  async updateFeatureFlag(id: string, is_enabled: boolean): Promise<FeatureFlag> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) return data;
    } catch (err) {}
    return { id, key: '', name: '', is_enabled };
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, profiles(first_name, last_name)')
        .order('created_at', { ascending: false });
      
      if (!error && data) return data as any;
    } catch (err) {}
    return getLocalStore<AuditLog>(LOGS_STORAGE_KEY);
  },

  async writeAuditLog(log: Omit<AuditLog, 'id' | 'created_at' | 'profiles'>): Promise<AuditLog | null> {
    const newLog: AuditLog = { ...log, id: 'log_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(log)
        .select()
        .single();
      
      if (!error && data) {
        const local = getLocalStore<AuditLog>(LOGS_STORAGE_KEY);
        setLocalStore(LOGS_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase writeAuditLog failed silently:', err);
    }

    const local = getLocalStore<AuditLog>(LOGS_STORAGE_KEY);
    setLocalStore(LOGS_STORAGE_KEY, [newLog, ...local]);
    return newLog;
  }
};
