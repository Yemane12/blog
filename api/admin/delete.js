import { getSupabase } from '../_lib/supabase.js';
import { getAdminToken, parseBody, sendRpcError } from '../_lib/auth.js';

/**
 * POST /api/admin/delete  { slug }
 * Permanently deletes a post. Requires the admin token.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
  const token = getAdminToken(req, body);
  if (!token) return res.status(401).json({ error: 'Missing admin token.' });

  const slug = (body.slug || '').toString().trim();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('delete_post', { p_token: token, p_slug: slug });
    if (error) return sendRpcError(res, error);
    if (!data) return res.status(404).json({ error: 'Post not found' });
    return res.status(200).json({ ok: true, slug: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
}
