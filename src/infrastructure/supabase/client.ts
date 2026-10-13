import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-tala.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureAnonymousAuthSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user.id;

    // Sign in anonymously if no active session
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('Supabase anonymous auth warning:', error.message);
      return null;
    }
    return data.user?.id || null;
  } catch (err) {
    console.warn('Supabase connection uninitialized. Falling back to local mode.', err);
    return null;
  }
}
