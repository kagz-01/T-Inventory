import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('Missing Supabase URL (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)');

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey || '');

// Admin client using service role key for server-side operations
if (!supabaseServiceRoleKey) {
  // We intentionally do not throw here so local dev without a service key can still build.
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set — server-side admin operations may fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '', {
  auth: { persistSession: false },
});

export default supabaseClient;
