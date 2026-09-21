import { getSupabase } from './_lib/supabase.js';

/**
 * GET /api/post?slug=<slug>
 * Returns a single published post including its full HTML content.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found' });

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ post: data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load post' });
  }
}
