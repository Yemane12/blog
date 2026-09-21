import { getRequestUser, getProfile, sendDbError } from '../_lib/auth.js';

/**
 * GET /api/admin/authors
 * Lists all user profiles so an admin can approve authors. Admin only.
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
    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only.' });
    }

    const { data, error } = await ctx.client
      .from('profiles')
      .select('id,email,display_name,role,created_at')
      .order('created_at', { ascending: true });

    if (error) return sendDbError(res, error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ authors: data ?? [], me: ctx.user.id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load authors.' });
  }
}
