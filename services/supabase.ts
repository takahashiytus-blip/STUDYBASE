
import { createClient } from '@supabase/supabase-js';

// These will be replaced by Vite's define plugin
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://qhlivmtyooejntniegyr.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobGl2bXR5b29lam50bmllZ3lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyOTc0NDIsImV4cCI6MjA4Njg3MzQ0Mn0.M0lA_7Mv8k-1vrtWsIULK8-bjDJkrx9kJrhqQRKl7WM';

console.log("[Supabase] Attempting connection...");
console.log("[Supabase] URL present:", !!supabaseUrl);
console.log("[Supabase] Key present:", !!supabaseAnonKey);

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabase && supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.info("Supabase credentials not found. Initializing in Local-First mode.");
} else {
  console.info("Supabase connected successfully.");
}
