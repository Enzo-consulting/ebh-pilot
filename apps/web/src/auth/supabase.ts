import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Credentials are read exclusively from environment variables.
// Never hard-code keys here.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase client instance.
  * Returns null when env variables are absent (demo / CI mode).
   */
   export const supabase: SupabaseClient | null =
     url && anonKey ? createClient(url, anonKey) : null;

     export const isSupabaseConfigured = Boolean(supabase);
