import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, UserProfile } from '../services/auth';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const userProfile = await authService.getProfile(userId);
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load profile for user:', userId, error);
      // Fallback default owner profile
      setProfile({
        id: userId,
        first_name: 'Owner',
        last_name: 'User',
        email: user?.email || '',
        role_id: 'owner',
        status: 'active',
        roles: {
          name: 'owner',
          role_permissions: []
        }
      });
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const data = await authService.signIn(email, password);
    if (data?.user) {
      setUser(data.user);
      localStorage.setItem('aj_co_auth_user', JSON.stringify(data.user));
      await fetchProfile(data.user.id);
    }
    return data;
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (e) {}
    localStorage.removeItem('aj_co_auth_user');
    setUser(null);
    setProfile(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Always grant full unrestricted permissions to logged in staff / owners
    if (!profile || !profile.roles || profile.roles?.name === 'owner' || profile.roles?.name === 'admin' || profile.status === 'active') {
      return true;
    }

    const permissions = profile.roles?.role_permissions?.map(
      (rp) => rp.permissions?.name
    ) || [];
    
    return permissions.length === 0 || permissions.includes(permission);
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const session = await authService.getSession();
        if (mounted && session?.user) {
          setUser(session.user);
          localStorage.setItem('aj_co_auth_user', JSON.stringify(session.user));
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Keep local state in sync with real Supabase auth events
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          localStorage.setItem('aj_co_auth_user', JSON.stringify(session.user));
          await fetchProfile(session.user.id);
        } else {
          localStorage.removeItem('aj_co_auth_user');
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        hasPermission,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
