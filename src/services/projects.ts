import { supabase } from '../lib/supabase.js';
import { Client } from './clients.js';

export interface Project {
  id?: string;
  client_id: string;
  name: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
  budget?: number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  clients?: Client;
}

export interface Milestone {
  id?: string;
  project_id: string;
  name: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'completed';
  created_at?: string;
}

const PROJECTS_STORAGE_KEY = 'ajco_crm_projects';
const MILESTONES_STORAGE_KEY = 'ajco_crm_milestones';

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

export const projectsService = {
  async getProjects(): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        setLocalStore(PROJECTS_STORAGE_KEY, data);
        return data;
      }
    } catch (err) {
      console.warn('Supabase projects fetch failed, fallback to local store:', err);
    }
    return getLocalStore<Project>(PROJECTS_STORAGE_KEY);
  },

  async createProject(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select('*, clients(company_name)')
        .single();
      
      if (!error && data) {
        const local = getLocalStore<Project>(PROJECTS_STORAGE_KEY);
        setLocalStore(PROJECTS_STORAGE_KEY, [data, ...local]);
        return data;
      }
    } catch (err) {
      console.warn('Supabase create project failed, saving locally:', err);
    }

    const local = getLocalStore<Project>(PROJECTS_STORAGE_KEY);
    const updated = [newProject, ...local];
    setLocalStore(PROJECTS_STORAGE_KEY, updated);
    return newProject;
  },

  async updateProject(id: string, project: Partial<Project>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(project)
        .eq('id', id)
        .select('*, clients(company_name)')
        .single();
      
      if (!error && data) {
        const local = getLocalStore<Project>(PROJECTS_STORAGE_KEY);
        const updated = local.map(p => p.id === id ? { ...p, ...data } : p);
        setLocalStore(PROJECTS_STORAGE_KEY, updated);
        return data;
      }
    } catch (err) {
      console.warn('Supabase update project failed:', err);
    }

    const local = getLocalStore<Project>(PROJECTS_STORAGE_KEY);
    let updatedProj: Project = { client_id: '', name: '', status: 'planning' };
    const updated = local.map(p => {
      if (p.id === id) {
        updatedProj = { ...p, ...project };
        return updatedProj;
      }
      return p;
    });
    setLocalStore(PROJECTS_STORAGE_KEY, updated);
    return updatedProj;
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await supabase
        .from('projects')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase delete project failed:', err);
    }

    const local = getLocalStore<Project>(PROJECTS_STORAGE_KEY);
    const updated = local.filter(p => p.id !== id);
    setLocalStore(PROJECTS_STORAGE_KEY, updated);
  },

  async softDeleteProject(id: string, _userId?: string): Promise<void> {
    return this.deleteProject(id);
  },

  async getMilestones(projectId: string): Promise<Milestone[]> {
    try {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (!error && data) return data;
    } catch (err) {}
    return getLocalStore<Milestone>(MILESTONES_STORAGE_KEY).filter(m => m.project_id === projectId);
  },

  async createMilestone(milestone: Omit<Milestone, 'id' | 'created_at'>): Promise<Milestone> {
    const newM: Milestone = { ...milestone, id: 'm_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data, error } = await supabase.from('project_milestones').insert(milestone).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Milestone>(MILESTONES_STORAGE_KEY);
    setLocalStore(MILESTONES_STORAGE_KEY, [newM, ...local]);
    return newM;
  },

  async updateMilestone(id: string, milestone: Partial<Milestone>): Promise<Milestone> {
    try {
      const { data, error } = await supabase.from('project_milestones').update(milestone).eq('id', id).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Milestone>(MILESTONES_STORAGE_KEY);
    let updatedM: Milestone = { project_id: '', name: '', status: 'pending' };
    const updated = local.map(m => {
      if (m.id === id) {
        updatedM = { ...m, ...milestone };
        return updatedM;
      }
      return m;
    });
    setLocalStore(MILESTONES_STORAGE_KEY, updated);
    return updatedM;
  }
};
