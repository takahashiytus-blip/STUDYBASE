import { createClient } from '@supabase/supabase-js';

// Vite environment variables
const getEnv = (key: string) => {
  return ((import.meta as any).env[key] || (window as any).process?.env?.[key] || "").trim();
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

console.log("[Supabase] Initializing...");
if (supabaseUrl) {
  const maskedUrl = supabaseUrl.replace(/(https?:\/\/[^.]+)\..*/, "$1...");
  console.log("[Supabase] URL found:", maskedUrl);
} else {
  console.warn("[Supabase] VITE_SUPABASE_URL is missing.");
}

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabase && supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'));

if (!isSupabaseConfigured) {
  console.warn("[Supabase] Credentials missing or invalid. Using Local Storage mode.");
} else {
  console.info("[Supabase] Client initialized successfully.");
}
