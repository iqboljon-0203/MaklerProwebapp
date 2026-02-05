import { createClient } from '@supabase/supabase-js';

// Access environment variables directly
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// IMPORTANT: Use Service Role Key for backend administrative tasks
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase Server Environment Variables (URL or SERVICE_ROLE_KEY)');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
