import { getSupabase } from './_lib/supabase.js';

/**
 * GET /api/ads?placement=home
 * Public list of active ads for a placement, highest weight first.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const placement = typeof req.query.placement === 'string' ? req.query.placement : 'home';

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('ads')
      .select('id,title,body,image_url,link_url,placement,weight')
      .eq('is_active', true)
      .eq('placement', placement)
      .order('weight', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ ads: data ?? [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load ads' });
  }
}
