
import { createClient } from '@supabase/supabase-js';

// Vercelの環境変数から読み込みます
// ローカル開発時は .env ファイルなどに設定してください
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("SupabaseのURLまたはAnonKeyが設定されていません。環境変数を確認してください。");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
