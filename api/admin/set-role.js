import { getRequestUser, getProfile, parseBody, sendDbError } from '../_lib/auth.js';

const ROLES = ['reader', 'author', 'admin'];

/**
 * POST /api/admin/set-role  { id, role }
 * Approve/change a user's role. Admin only (also enforced by RLS).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getRequestUser(req);
  if (!ctx) return res.status(401).json({ error: 'Please sign in.' });

  const body = parseBody(req);
  const id = (body.id || '').toString().trim();
  const role = (body.role || '').toString().trim();
  if (!id || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Provide a user id and a role of reader, author, or admin.' });
  }

  try {
    const me = await getProfile(ctx);
    if (me.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
    if (id === ctx.user.id && role !== 'admin') {
      return res.status(400).json({ error: "You can't remove your own admin role here." });
    }

    const { data, error } = await ctx.client
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select('id,role');

    if (error) return sendDbError(res, error);
    if (!data || data.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.status(200).json({ ok: true, id, role: data[0].role });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update role.' });
  }
}
