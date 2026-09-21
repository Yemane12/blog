import { createClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client for the serverless API.
 * Reads its configuration from environment variables set in Vercel:
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 * The anon key is safe to use here because Row Level Security limits it to
 * reading published posts and inserting newsletter subscribers.
 */
const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

export function getSupabase() {
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Columns exposed for post listings (no full content). */
export const LIST_COLUMNS =
  'slug,title,dek,excerpt,category,read_minutes,tags,published_at';
