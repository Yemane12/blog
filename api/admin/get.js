import { getRequestUser, sendDbError } from '../_lib/auth.js';

/**
 * GET /api/admin/get?slug=<slug>
 * One full post (for editing). RLS returns it only if the user may see it
 * (own post, admin, or it is published). Requires a Supabase session.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getRequestUser(req);
  if (!ctx) return res.status(401).json({ error: 'Please sign in.' });

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const { data, error } = await ctx.client
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) return sendDbError(res, error);
    if (!data) return res.status(404).json({ error: 'Post not found' });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ post: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load post.' });
  }
}
