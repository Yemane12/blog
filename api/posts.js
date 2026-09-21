import { getSupabase, LIST_COLUMNS } from './_lib/supabase.js';

/**
 * GET /api/posts
 * Returns the list of published posts, newest first (metadata only).
 * Optional query params:
 *   - limit: max number of posts (default 50)
 *   - tag:   filter to posts containing this tag
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const tag = typeof req.query.tag === 'string' ? req.query.tag : null;

    const supabase = getSupabase();
    let query = supabase
      .from('posts')
      .select(LIST_COLUMNS)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (tag) query = query.contains('tags', [tag]);

    const { data, error } = await query;
    if (error) throw error;

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ posts: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load posts' });
  }
}
