import { getRequestUser, getProfile } from './_lib/auth.js';

/**
 * GET /api/me
 * Returns the signed-in user's basic info and profile (role, display name).
 * Used by the UI to decide what to show. Requires a Supabase session.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getRequestUser(req);
  if (!ctx) return res.status(401).json({ error: 'Not signed in.' });

  try {
    const profile = await getProfile(ctx);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      user: { id: ctx.user.id, email: ctx.user.email },
      profile,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load account.' });
  }
}
