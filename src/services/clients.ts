import { supabase } from '../lib/supabase.js';

export interface Client {
  id?: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  website?: string;
  notes?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string;
}

export interface Lead {
  id?: string;
  client_id: string;
  title: string;
  value: number;
  stage: 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
  notes?: string;
  created_at?: string;
  clients?: Client;
}

export interface MeetingNote {
  id?: string;
  client_id: string;
  title: string;
  notes: string;
  summary?: string;
  created_at?: string;
}

// Local storage keys for resilient fallback
const CLIENTS_STORAGE_KEY = 'ajco_crm_clients';
const LEADS_STORAGE_KEY = 'ajco_crm_leads';
const NOTES_STORAGE_KEY = 'ajco_crm_notes';

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

export const clientsService = {
  async getClients(): Promise<Client[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .is('deleted_at', null)
        .order('company_name', { ascending: true });
      
      if (!error && data && data.length > 0) {
        setLocalStore(CLIENTS_STORAGE_KEY, data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase clients fetch failed, fallback to local store:', err);
    }
    return getLocalStore<Client>(CLIENTS_STORAGE_KEY);
  },

  async createClient(client: Omit<Client, 'id' | 'created_at'>): Promise<Client> {
    const newClient: Client = {
      ...client,
      id: 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      
      if (!error && data) {
        const local = getLocalStore<Client>(CLIENTS_STORAGE_KEY);
        setLocalStore(CLIENTS_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase create client failed, saving locally:', err);
    }

    const local = getLocalStore<Client>(CLIENTS_STORAGE_KEY);
    const updated = [newClient, ...local];
    setLocalStore(CLIENTS_STORAGE_KEY, updated);
    return newClient;
  },

  async updateClient(id: string, client: Partial<Client>): Promise<Client> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(client)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) {
        const local = getLocalStore<Client>(CLIENTS_STORAGE_KEY);
        const updated = local.map(c => c.id === id ? { ...c, ...data } : c);
        setLocalStore(CLIENTS_STORAGE_KEY, updated);
        return data;
      }
    } catch (err) {
      console.warn('Supabase update client failed:', err);
    }

    const local = getLocalStore<Client>(CLIENTS_STORAGE_KEY);
    let updatedClient: Client = { company_name: '', contact_name: '', email: '' };
    const updated = local.map(c => {
      if (c.id === id) {
        updatedClient = { ...c, ...client };
        return updatedClient;
      }
      return c;
    });
    setLocalStore(CLIENTS_STORAGE_KEY, updated);
    return updatedClient;
  },

  async softDeleteClient(id: string, userId: string): Promise<void> {
    try {
      await supabase
        .from('clients')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase soft delete failed:', err);
    }

    const local = getLocalStore<Client>(CLIENTS_STORAGE_KEY);
    const updated = local.filter(c => c.id !== id);
    setLocalStore(CLIENTS_STORAGE_KEY, updated);
  },

  async getLeads(): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setLocalStore(LEADS_STORAGE_KEY, data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase leads fetch failed:', err);
    }
    return getLocalStore<Lead>(LEADS_STORAGE_KEY);
  },

  async createLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: 'lead_' + Date.now(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();
      
      if (!error && data) {
        const local = getLocalStore<Lead>(LEADS_STORAGE_KEY);
        setLocalStore(LEADS_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase lead create failed:', err);
    }

    const local = getLocalStore<Lead>(LEADS_STORAGE_KEY);
    setLocalStore(LEADS_STORAGE_KEY, [newLead, ...local]);
    return newLead;
  },

  async updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(lead)
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) {
        const local = getLocalStore<Lead>(LEADS_STORAGE_KEY);
        const updated = local.map(l => l.id === id ? { ...l, ...data } : l);
        setLocalStore(LEADS_STORAGE_KEY, updated);
        return data;
      }
    } catch (err) {
      console.warn('Supabase lead update failed:', err);
    }

    const local = getLocalStore<Lead>(LEADS_STORAGE_KEY);
    let updatedLead: Lead = { client_id: '', title: '', value: 0, stage: 'new' };
    const updated = local.map(l => {
      if (l.id === id) {
        updatedLead = { ...l, ...lead };
        return updatedLead;
      }
      return l;
    });
    setLocalStore(LEADS_STORAGE_KEY, updated);
    return updatedLead;
  },

  async getMeetingNotes(clientId: string): Promise<MeetingNote[]> {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase meeting notes fetch failed:', err);
    }
    const allNotes = getLocalStore<MeetingNote>(NOTES_STORAGE_KEY);
    return allNotes.filter(n => n.client_id === clientId);
  },

  async createMeetingNote(note: Omit<MeetingNote, 'id' | 'created_at'>): Promise<MeetingNote> {
    const newNote: MeetingNote = {
      ...note,
      id: 'note_' + Date.now(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .insert(note)
        .select()
        .single();
      
      if (!error && data) {
        const local = getLocalStore<MeetingNote>(NOTES_STORAGE_KEY);
        setLocalStore(NOTES_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase meeting note create failed:', err);
    }

    const local = getLocalStore<MeetingNote>(NOTES_STORAGE_KEY);
    setLocalStore(NOTES_STORAGE_KEY, [newNote, ...local]);
    return newNote;
  }
};
