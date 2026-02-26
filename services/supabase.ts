
import { createClient } from '@supabase/supabase-js';

// These will be replaced by Vite's define plugin
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[Supabase] URL detected:", supabaseUrl ? "Yes" : "No");
console.log("[Supabase] Key detected:", supabaseAnonKey ? "Yes" : "No");

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabase && supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.info("Supabase credentials not found. Initializing in Local-First mode.");
}
