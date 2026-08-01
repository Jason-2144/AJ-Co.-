import { createClient } from '@supabase/supabase-js';

// Safe access for both Node (server) and Vite (client)
const supabaseUrl = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || 
                    (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) || 
                        (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY inside .env'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
