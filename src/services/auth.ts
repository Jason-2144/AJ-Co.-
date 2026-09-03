import { supabase } from '../lib/supabase.js';

export interface UserPermission {
  name: string;
}

export interface UserRole {
  name: string;
  role_permissions: {
    permissions: UserPermission;
  }[];
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_id: string;
  status: string;
  roles?: UserRole;
}

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, roles(name, role_permissions(permissions(name)))')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as any;
  }
};
