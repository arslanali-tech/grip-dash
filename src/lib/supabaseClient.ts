import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or anon key is not set. Check your .env.local or environment configuration.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
