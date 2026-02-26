
import { createClient } from '@supabase/supabase-js';

const getEnv = (name: string) => {
  try {
    const metaEnv = (import.meta as any).env;
    const procEnv = typeof process !== 'undefined' ? process.env : {};
    
    // Check name, VITE_name, and name without VITE_
    const variations = [name, `VITE_${name}`, name.replace('VITE_', '')];
    
    for (const v of variations) {
      if (metaEnv && metaEnv[v]) return metaEnv[v];
      if (procEnv && (procEnv as any)[v]) return (procEnv as any)[v];
    }

    return '';
  } catch (e) {
    return '';
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Debugging: Log all available keys (not values) to see what's being loaded
console.log("[Supabase] Available meta keys:", Object.keys((import.meta as any).env).filter(k => k.includes('SUPABASE')));
if (typeof process !== 'undefined' && process.env) {
  console.log("[Supabase] Available process keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

console.log("[Supabase] URL detected:", supabaseUrl ? "Yes (Length: " + supabaseUrl.length + ")" : "No");
console.log("[Supabase] Key detected:", supabaseAnonKey ? "Yes (Length: " + supabaseAnonKey.length + ")" : "No");

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!(supabase && supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.info("Supabase credentials not found. Initializing in Local-First mode.");
}
