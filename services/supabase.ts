import { createClient } from '@supabase/supabase-js';

// Vite environment variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY?.trim();

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
