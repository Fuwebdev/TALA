import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ldlprnwlmdajfwcrdolw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbHBybndsbWRhamZ3Y3Jkb2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNDM2NDMsImV4cCI6MjEwNjkxOTY0M30.l-omz1-JFp3eaeXZ8xCEbWHdbWduZYB5LsxeOFj8dhE';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function ensureAnonymousAuthSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user.id;

    // Sign in anonymously if no active session
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return null;
    }
    return data.user?.id || null;
  } catch {
    return null;
  }
}
