import { getSupabase } from '../_lib/supabase.js';
import { getAdminToken, sendRpcError } from '../_lib/auth.js';

/**
 * GET /api/admin/list
 * Returns every post, including unpublished drafts. Requires the admin token.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getAdminToken(req);
  if (!token) return res.status(401).json({ error: 'Missing admin token.' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_list_posts', { p_token: token });
    if (error) return sendRpcError(res, error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ posts: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load posts.' });
  }
}
