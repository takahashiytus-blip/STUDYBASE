
import { createClient } from '@supabase/supabase-js';

// process.env または import.meta.env の両方をチェック
const supabaseUrl = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn("Supabase configuration is missing. Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required for database features.");
}
