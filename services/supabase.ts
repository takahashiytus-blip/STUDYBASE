
import { createClient } from '@supabase/supabase-js';

// 複数の環境変数名のパターンをチェック
const getEnv = (name: string) => {
  if (typeof process !== 'undefined' && process.env[name]) return process.env[name];
  if ((import.meta as any).env && (import.meta as any).env[name]) return (import.meta as any).env[name];
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.log("Supabase is not configured. Falling back to Demo/Local mode.");
}
