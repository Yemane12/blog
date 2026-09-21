import { getSupabase } from './_lib/supabase.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/subscribe
 * Body: { email: string, source?: string }
 * Stores a newsletter subscriber in Supabase.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const email = (body?.email ?? '').toString().trim().toLowerCase();
  const source = body?.source ? body.source.toString().slice(0, 200) : null;

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('subscribers').insert({ email, source });

    if (error) {
      // Unique violation: the email is already on the list.
      if (error.code === '23505') {
        return res.status(200).json({ ok: true, message: "You're already subscribed — thank you!" });
      }
      throw error;
    }

    return res
      .status(201)
      .json({ ok: true, message: 'Thanks for subscribing! Check your inbox to confirm.' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
