import { getSupabase } from './_lib/supabase.js';

/**
 * GET /articles/:slug  (rewritten here by vercel.json)
 * Server-renders a full article page from the database so posts work without
 * JavaScript and are crawlable. The page reuses the site's existing CSS.
 */
const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

/**
 * Builds the "previous / next" nav and a "More to read" grid from the full
 * list of published posts. Appears at the end of the article — after the
 * reader has finished — so it never interrupts reading.
 */
function relatedHtml(current, all) {
  if (!Array.isArray(all) || all.length === 0) return '';
  const idx = all.findIndex((p) => p.slug === current.slug);
  const newer = idx > 0 ? all[idx - 1] : null;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const tags = current.tags || [];
  const others = all.filter(
    (p) => p.slug !== current.slug && (!newer || p.slug !== newer.slug) && (!older || p.slug !== older.slug)
  );
  let related = others.filter((p) => (p.tags || []).some((t) => tags.includes(t)));
  for (const p of others) {
    if (related.length >= 3) break;
    if (!related.includes(p)) related.push(p);
  }
  related = related.slice(0, 3);

  const card = (p) => `
        <a class="related-card" href="/articles/${encodeURIComponent(p.slug)}">
          ${p.cover_image
            ? `<img class="related-card__img" src="${esc(p.cover_image)}" alt="" loading="lazy">`
            : '<span class="related-card__img related-card__img--empty"></span>'}
          <span class="related-card__title">${esc(p.title)}</span>
        </a>`;

  const nav = (older || newer)
    ? `
      <nav class="post-nav" aria-label="More posts">
        ${older
          ? `<a class="post-nav__link post-nav__prev" href="/articles/${encodeURIComponent(older.slug)}"><span class="post-nav__dir">← Previous</span><span class="post-nav__title">${esc(older.title)}</span></a>`
          : '<span></span>'}
        ${newer
          ? `<a class="post-nav__link post-nav__next" href="/articles/${encodeURIComponent(newer.slug)}"><span class="post-nav__dir">Next →</span><span class="post-nav__title">${esc(newer.title)}</span></a>`
          : '<span></span>'}
      </nav>`
    : '';

  const grid = related.length
    ? `
      <section class="related" aria-label="More essays">
        <h2 class="related__heading">More to read</h2>
        <div class="related__grid">${related.map(card).join('')}</div>
      </section>`
    : '';

  if (!nav && !grid) return '';
  return `<div class="container">${nav}${grid}</div>`;
}

function renderPage(post, origin, extras) {
  extras = extras || {};
  const url = `${origin}/articles/${post.slug}`;
  const title = esc(post.title);
  const dek = esc(post.dek || '');
  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(url);
  const tagsHtml = (post.tags || [])
    .map(
      (t) =>
        `<a href="/tags.html#${encodeURIComponent(String(t).toLowerCase())}" class="article__tag">${esc(t)}</a>`
    )
    .join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${title} — ${dek}">
  <meta name="theme-color" content="#FAFAFA" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#09090B" media="(prefers-color-scheme: dark)">
  <title>${title} — Public Blog</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Bodoni:wght@400;500;600;700&family=Public+Sans:wght@300;400;500;600;700&display=swap">
  <link rel="stylesheet" href="/css/tokens.css">
  <link rel="stylesheet" href="/css/main.css">
  <link rel="alternate" type="application/rss+xml" title="Public Blog RSS Feed" href="/feed.xml">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="manifest" href="/assets/manifest.json">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${dek}">
  <meta property="og:url" content="${esc(url)}">
  ${post.cover_image ? `<meta property="og:image" content="${esc(post.cover_image)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${dek}">
  ${post.cover_image ? `<meta name="twitter:image" content="${esc(post.cover_image)}">` : ''}
</head>
<body>
  <div id="reading-progress" aria-hidden="true"></div>
  <header class="header" role="banner">
    <div class="header__inner">
      <a href="/" class="header__brand" aria-label="Public Blog — Home">Public Blog</a>
      <nav class="header__nav" role="navigation" aria-label="Main navigation">
        <a href="/" class="header__nav-link">Read</a>
        <a href="/archive.html" class="header__nav-link">Archive</a>
        <a href="/about.html" class="header__nav-link">About</a>
        <a href="#subscribe" class="header__nav-link header__cta btn btn-secondary">Subscribe</a>
      </nav>
    </div>
  </header>

  <main class="main" role="main">
    <article class="article">
      ${post.cover_image ? `<img class="article__cover" src="${esc(post.cover_image)}" alt="">` : ''}
      <header class="article__header">
        <div class="article__meta">
          <span class="article__category">${esc(post.category || 'Essay')}</span>
          <time datetime="${esc(post.published_at)}">${fmtDate(post.published_at)}</time>
          <span aria-hidden="true">·</span>
          <span>${Number(post.read_minutes) || 5} min read</span>
        </div>
        <h1 class="article__title">${title}</h1>
        <p class="article__dek">${dek}</p>
        <div class="article__author">
          <img src="/assets/images/author.jpg" alt="" class="article__author-avatar" loading="lazy">
          <div>
            <p class="article__author-name">${esc(post.author_name || 'Alex Chen')}</p>
            <p class="article__author-bio">${esc(post.author_bio || '')}</p>
          </div>
        </div>
      </header>

      <div class="article__content">
        ${post.content || ''}
      </div>

      <footer class="article__footer">
        <div class="article__tags">
          ${tagsHtml}
        </div>
        <div class="article__share">
          <span>Share this article</span>
          <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" class="article__share-link" aria-label="Share on Twitter" target="_blank" rel="noopener">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" class="article__share-link" aria-label="Share on LinkedIn" target="_blank" rel="noopener">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          </a>
          <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="article__share-link" aria-label="Share via Email">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </a>
        </div>
      </footer>
    </article>

    ${extras.related || ''}

    <section class="newsletter" id="subscribe" aria-labelledby="newsletter-heading">
      <div class="container">
        <h2 id="newsletter-heading" class="newsletter__headline">Liked this one?</h2>
        <p class="newsletter__description">Get the next essay delivered to your inbox. No spam. No tracking. Unsubscribe anytime.</p>
        <form class="newsletter__form" id="newsletter-form" novalidate>
          <div class="form-group">
            <label for="email" class="label sr-only">Email address</label>
            <input type="email" id="email" name="email" class="input newsletter__input" placeholder="your@email.com" required autocomplete="email" aria-describedby="email-error email-success">
            <p id="email-error" class="form-error" aria-live="polite" hidden></p>
            <p id="email-success" class="form-success" aria-live="polite" hidden></p>
          </div>
          <button type="submit" class="btn btn-primary newsletter__btn">Subscribe</button>
        </form>
      </div>
    </section>
  </main>

  <footer class="footer" role="contentinfo">
    <div class="footer__inner">
      <div class="footer__bottom">
        <p class="footer__copyright">&copy; 2026 Public Blog. All rights reserved.</p>
        <p><a href="/" class="footer__link">← Back to all essays</a></p>
      </div>
    </div>
  </footer>

  <script src="/js/main.js" defer></script>
</body>
</html>`;
}

export default async function handler(req, res) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  const proto = (req.headers['x-forwarded-proto'] || 'https').toString().split(',')[0];
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString();
  const origin = host ? `${proto}://${host}` : '';

  if (!slug) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(400).send('<h1>400 — Missing article slug</h1>');
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (!data) {
      res.setHeader('Cache-Control', 'no-store');
      return res
        .status(404)
        .send('<!DOCTYPE html><meta charset="utf-8"><title>Not found</title><p>Article not found. <a href="/">Back home</a>.</p>');
    }

    let related = '';
    try {
      const { data: all } = await supabase
        .from('posts')
        .select('slug,title,cover_image,published_at,tags')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      related = relatedHtml(data, all || []);
    } catch (_) {
      /* related section is optional */
    }

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(renderPage(data, origin, { related }));
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(`<!DOCTYPE html><meta charset="utf-8"><title>Error</title><p>Could not load this article.</p>`);
  }
}
