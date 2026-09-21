/** Shared helpers for the token-gated admin API. */

/** Parse a JSON body whether Vercel gave us an object or a raw string. */
export function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return body || {};
}

/**
 * Extract the admin token from (in order): Authorization: Bearer <t>,
 * x-admin-token header, or a `token` field in the body.
 */
export function getAdminToken(req, body) {
  const auth = (req.headers['authorization'] || '').toString();
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return (req.headers['x-admin-token'] || bearer || (body && body.token) || '').toString().trim();
}

/** Map a Supabase RPC error to an HTTP response (401 for the token gate). */
export function sendRpcError(res, error) {
  if (error.code === '42501' || /unauthorized/i.test(error.message || '')) {
    return res.status(401).json({ error: 'Invalid admin token.' });
  }
  return res.status(400).json({ error: error.message || 'Request failed.' });
}
