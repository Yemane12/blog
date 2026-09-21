import { getRequestUser, parseBody, sendDbError } from '../_lib/auth.js';

/**
 * POST /api/admin/delete  { slug }
 * Deletes a post. RLS allows only the post's author (or an admin).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getRequestUser(req);
  if (!ctx) return res.status(401).json({ error: 'Please sign in.' });

  const body = parseBody(req);
  const slug = (body.slug || '').toString().trim();
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const { data, error } = await ctx.client
      .from('posts')
      .delete()
      .eq('slug', slug)
      .select('slug');

    if (error) return sendDbError(res, error);
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Post not found (or not yours to delete).' });
    }
    return res.status(200).json({ ok: true, slug });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete post.' });
  }
}
