import { createClient } from '@supabase/supabase-js';

// These should be in .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a client only if the keys are defined, otherwise return a mock/null client 
// to prevent runtime crash during initial setup before user adds keys
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
