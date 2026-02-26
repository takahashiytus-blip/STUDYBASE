
import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  try {
    // Check if process is defined safely
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
    // Check import.meta.env as fallback
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) {
      return metaEnv[name];
    }
    return '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.info("Supabase credentials not found. Initializing in Local-First mode.");
}
