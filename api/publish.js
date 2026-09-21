import { toHtml, estimateReadMinutes, slugify } from './_lib/markdown.js';
import { getRequestUser, parseBody, sendDbError } from './_lib/auth.js';

/**
 * POST /api/publish
 * Create or update one of the signed-in author's posts. Requires a Supabase
 * session (Authorization: Bearer <access_token>). Row Level Security enforces
 * that only approved authors can publish and only to their own posts.
 *
 * Body (JSON):
 *   title        (required)
 *   body         markdown-ish source        \ one of these is required
 *   content      raw HTML (used as-is)       /
 *   slug         optional (derived from title)
 *   dek, excerpt, category, author_name, author_bio   optional
 *   tags         array or comma-separated string
 *   read_minutes optional (estimated if omitted)
 *   published_at optional ISO date
 *   is_published optional boolean (default true)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getRequestUser(req);
  if (!ctx) return res.status(401).json({ error: 'Please sign in.' });

  const body = parseBody(req);

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

  const fallbackName = (ctx.user.user_metadata && ctx.user.user_metadata.display_name)
    || (ctx.user.email ? ctx.user.email.split('@')[0] : 'Author');

  const row = {
    slug,
    title,
    dek: (body.dek || '').toString() || null,
    excerpt: (body.excerpt || body.dek || '').toString() || null,
    category: (body.category || 'Essay').toString(),
    content,
    read_minutes: readMinutes,
    tags,
    author_name: (body.author_name || fallbackName).toString(),
    author_bio: (body.author_bio || '').toString(),
    published_at: publishedAt,
    is_published: body.is_published === false ? false : true,
    author_id: ctx.user.id,
  };

  try {
    // Upsert on slug. RLS ensures the author owns the row (or is admin).
    const { data, error } = await ctx.client
      .from('posts')
      .upsert(row, { onConflict: 'slug' })
      .select('slug')
      .single();

    if (error) return sendDbError(res, error);
    return res.status(200).json({
      ok: true,
      slug: data.slug,
      url: `/articles/${data.slug}`,
      read_minutes: readMinutes,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong while publishing.' });
  }
}
