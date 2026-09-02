import { createClient } from '@supabase/supabase-js';

// Server-only client using the Supabase service role key. Bypasses RLS entirely — never import
// this from browser/frontend code. Used by backend repositories (e.g. Beautiful Postman) whose
// tables have RLS enabled but no policies, since server.ts talks to Supabase with no user session.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Supabase admin environment variables are missing. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY inside .env'
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder-key',
  { auth: { persistSession: false, autoRefreshToken: false } }
);
