/** Shared helpers for the authenticated API (Supabase Auth JWT + RLS). */
import { getUserSupabase } from './supabase.js';

/** Parse a JSON body whether Vercel gave us an object or a raw string. */
export function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}

/** Extract the Bearer access token (Supabase session JWT) from the request. */
export function getBearerToken(req) {
  const auth = (req.headers['authorization'] || '').toString();
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

/**
 * Resolve the signed-in user from the request's Bearer token.
 * Returns { client, user, jwt } (a Supabase client scoped to that user so RLS
 * applies), or null when there is no valid session.
 */
export async function getRequestUser(req) {
  const jwt = getBearerToken(req);
  if (!jwt) return null;
  try {
    const client = getUserSupabase(jwt);
    const { data, error } = await client.auth.getUser(jwt);
    if (error || !data?.user) return null;
    return { client, user: data.user, jwt };
  } catch {
    return null;
  }
}

/** Fetch the signed-in user's profile row (role, display name, bio). */
export async function getProfile(ctx) {
  const { data } = await ctx.client
    .from('profiles')
    .select('id,email,display_name,bio,role')
    .eq('id', ctx.user.id)
    .maybeSingle();
  return data || { id: ctx.user.id, email: ctx.user.email, role: 'reader' };
}

/** Map a Postgres/PostgREST error to a sensible HTTP response. */
export function sendDbError(res, error) {
  // 42501 = RLS/insufficient privilege; PGRST codes for RLS violations too.
  if (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) {
    return res.status(403).json({ error: 'You are not allowed to do that. Author approval may be required.' });
  }
  if (error.code === '23505') {
    return res.status(409).json({ error: 'That slug is already in use.' });
  }
  return res.status(400).json({ error: error.message || 'Request failed.' });
}
