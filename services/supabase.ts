
import { createClient } from '@supabase/supabase-js';

// process.env からの取得を試みる（vite.config.ts の define により注入される）
const getEnv = (name: string) => {
  try {
    return process.env[name] || (import.meta as any).env?.[name] || '';
  } catch {
    return (import.meta as any).env?.[name] || '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.info("Supabase credentials not found. Initializing in Local-First mode.");
}
