import { getSupabase } from '../_lib/supabase.js';
import { getAdminToken, sendRpcError } from '../_lib/auth.js';

/**
 * GET /api/admin/get?slug=<slug>
 * Returns one full post (including content and draft state) for editing.
 * Requires the admin token.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getAdminToken(req);
  if (!token) return res.status(401).json({ error: 'Missing admin token.' });

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_post', { p_token: token, p_slug: slug });
    if (error) return sendRpcError(res, error);
    if (!data || !data.slug) return res.status(404).json({ error: 'Post not found' });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ post: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load post.' });
  }
}
