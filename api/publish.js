import { getSupabase } from './_lib/supabase.js';
import { toHtml, estimateReadMinutes, slugify } from './_lib/markdown.js';
import { getAdminToken, parseBody } from './_lib/auth.js';

/**
 * POST /api/publish
 * Create or update a post. Requires the admin token, which is verified inside
 * the database by the publish_post() function (the token is never trusted
 * client-side and never stored in the page).
 *
 * Auth: send the token as `Authorization: Bearer <token>`, an `x-admin-token`
 * header, or a `token` field in the JSON body.
 *
 * Body (JSON):
 *   title        (required)
 *   body         markdown-ish source        \ one of these is required
 *   content      raw HTML (used as-is)       /
 *   slug         optional (derived from title)
 *   dek, excerpt, category, author_name, author_bio   optional
 *   tags         optional: array or comma-separated string
 *   read_minutes optional (estimated if omitted)
 *   published_at optional ISO date/datetime
 *   is_published optional boolean (default true)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseBody(req);
  const token = getAdminToken(req, body);
  if (!token) return res.status(401).json({ error: 'Missing admin token.' });

  const title = (body.title || '').toString().trim();
  if (!title) return res.status(400).json({ error: 'A title is required.' });

  const content = (body.content && body.content.toString().trim())
    ? body.content.toString()
    : toHtml(body.body || '');
  if (!content.trim()) return res.status(400).json({ error: 'Post body/content is required.' });

  const slug = slugify(body.slug || title);
  if (!slug) return res.status(400).json({ error: 'Could not derive a valid slug from the title.' });

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => t.toString().trim()).filter(Boolean)
    : (body.tags || '')
        .toString()
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const readMinutes = Number(body.read_minutes) > 0
    ? Math.round(Number(body.read_minutes))
    : estimateReadMinutes(content);

  let publishedAt = new Date().toISOString();
  if (body.published_at) {
    const d = new Date(body.published_at);
    if (!isNaN(d)) publishedAt = d.toISOString();
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('publish_post', {
      p_token: token,
      p_slug: slug,
      p_title: title,
      p_dek: (body.dek || '').toString() || null,
      p_excerpt: (body.excerpt || body.dek || '').toString() || null,
      p_category: (body.category || 'Essay').toString(),
      p_content: content,
      p_read_minutes: readMinutes,
      p_tags: tags,
      p_author_name: (body.author_name || 'Alex Chen').toString(),
      p_author_bio: (body.author_bio || 'Writer, reader, occasional builder of things.').toString(),
      p_published_at: publishedAt,
      p_is_published: body.is_published === false ? false : true,
    });

    if (error) {
      // 42501 = our "unauthorized" token check inside the DB function.
      if (error.code === '42501' || /unauthorized/i.test(error.message || '')) {
        return res.status(401).json({ error: 'Invalid admin token.' });
      }
      return res.status(400).json({ error: error.message || 'Publish failed.' });
    }

    return res.status(200).json({
      ok: true,
      slug: data,
      url: `/articles/${data}`,
      read_minutes: readMinutes,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong while publishing.' });
  }
}
