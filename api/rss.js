import { getSupabase } from './_lib/supabase.js';

/**
 * GET /feed.xml (rewritten here) — RSS 2.0 feed built from published posts.
 */
const xmlEscape = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const cdata = (s = '') => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

const rfc822 = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  const origin = host ? `${proto}://${host}` : '';

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('posts')
      .select('slug,title,dek,excerpt,content,published_at,author_name,tags,cover_image')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    const posts = data || [];

    const lastBuild = posts.length ? rfc822(posts[0].published_at) : new Date().toUTCString();

    const items = posts
      .map((p) => {
        const link = `${origin}/articles/${p.slug}`;
        const desc = p.dek || p.excerpt || '';
        const categories = (p.tags || [])
          .map((t) => `      <category>${xmlEscape(t)}</category>`)
          .join('\n');
        return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${rfc822(p.published_at)}</pubDate>
      ${p.author_name ? `<dc:creator>${cdata(p.author_name)}</dc:creator>` : ''}
${categories}
      <description>${cdata(desc)}</description>
      <content:encoded>${cdata(p.content || desc)}</content:encoded>
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Public Blog</title>
    <link>${xmlEscape(origin || 'https://publicblog.example')}</link>
    <description>Thoughtful essays, stories, and commentary for curious readers.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${xmlEscape(origin)}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(xml);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send('Could not generate feed.');
  }
}
