import { getRequestUser, getProfile, sendDbError } from '../_lib/auth.js';

/**
 * GET /api/admin/list
 * Posts the signed-in user can manage: their own (incl. drafts), or every post
 * if they are an admin. Requires a Supabase session.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getRequestUser(req);
  if (!ctx) return res.status(401).json({ error: 'Please sign in.' });

  try {
    const profile = await getProfile(ctx);
    let query = ctx.client
      .from('posts')
      .select('slug,title,dek,category,tags,read_minutes,published_at,is_published,author_id,author_name')
      .order('published_at', { ascending: false });

    if (profile.role !== 'admin') {
      query = query.eq('author_id', ctx.user.id);
    }

    const { data, error } = await query;
    if (error) return sendDbError(res, error);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ posts: data ?? [], role: profile.role });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load posts.' });
  }
}
