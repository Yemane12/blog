# Public Blog

A personal blog with a **Supabase (Postgres) backend**, served as static HTML/CSS/JS
with a small set of **Vercel serverless functions**, and deployed on **Vercel**.

Posts and newsletter subscribers live in Supabase. The homepage and archive load
the post list from the database, article pages are server-rendered from the database
(so they work without JavaScript and are crawlable), and the newsletter form writes
real subscribers to the database.

## Architecture

```
Browser ──> Static HTML/CSS/JS (index, archive, tags, about, ...)
        └─> /api/posts            (list published posts)      ─┐
        └─> /api/post?slug=…       (single post JSON)           ├─> Supabase Postgres
        └─> /articles/:slug        (server-rendered article)   │   (posts, subscribers)
        └─> /api/subscribe (POST)  (newsletter signup)         ─┘
```

- **Database:** Supabase project `blog`. Tables `posts` and `subscribers`, both with
  Row Level Security. Anyone may read published posts and insert a subscriber; the
  subscriber list is not publicly readable.
- **API:** Node serverless functions in `/api`, using `@supabase/supabase-js` with the
  anon key (safe under RLS). Configured via env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- **Routing:** `vercel.json` rewrites `/articles/:slug` to the server-rendering function.

### Database setup / re-seeding

- Schema lives in `supabase/migrations/`.
- `supabase/seed.sql` is generated from the article HTML in `articles/` by
  `node scripts/generate-seed.mjs` and loaded into the `posts` table.

### Publishing new posts

Two ways to add a post to the database:

1. **Admin page (easiest):** visit `/admin.html`, paste your **admin token**, write the
   essay in plain text (blank lines = paragraphs; `## Heading`, `> quote`, `- list`,
   `**bold**`, `[link](https://…)`), and click **Publish**. The post appears immediately
   on the homepage, archive, and at `/articles/<slug>`. The token is stored only in your
   browser. The same page also **lists every post** (including drafts) with **Edit**,
   **Publish/Unpublish**, and **Delete** controls.

2. **API** (all token-gated; send `Authorization: Bearer <token>` or an `x-admin-token` header):
   - `POST /api/publish` — create/update `{ title, body | content, dek, tags, is_published, … }`
   - `GET  /api/admin/list` — all posts, including drafts
   - `GET  /api/admin/get?slug=…` — one full post (for editing)
   - `POST /api/admin/set-published` — `{ slug, is_published }`
   - `POST /api/admin/delete` — `{ slug }`

Publishing is gated by the `publish_post()` Postgres function, which verifies the admin
token against a value in the private `private.settings` table before writing — so even the
public anon key cannot create posts without it. Set / rotate the token with:

```sql
insert into private.settings (key, value) values ('admin_token', '<new-secret>')
on conflict (key) do update set value = excluded.value;
```

### Environment variables (set in Vercel Project Settings → Environment Variables)

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon or publishable key>
```

See `.env.example`.

---

## Original static design

Built with static HTML/CSS/JS — zero build step, zero framework, minimal dependencies.

## Design System

**Swiss Modernism 2.0** — Grid-based, typography-led, restrained accent color.
- **Fonts:** Libre Bodoni (headings) + Public Sans (body)
- **Colors:** Editorial black (`#18181B`) on warm white (`#FAFAFA`) with accent pink (`#EC4899`)
- **Dark mode:** Automatic via `prefers-color-scheme`
- **Icons:** Lucide SVG (inline)

## Structure

```
blog/
├── index.html          # Homepage with lead article + recent list
├── archive.html        # All articles by year
├── tags.html           # Articles by topic
├── about.html          # About page
├── feed.xml            # RSS 2.0 feed
├── 404.html            # Not found page
├── privacy.html        # Privacy policy
├── terms.html          # Terms of service
├── css/
│   ├── tokens.css      # Design tokens (colors, spacing, type scale)
│   └── main.css        # Component styles + page layouts
├── js/
│   └── main.js         # Progressive enhancement (newsletter, lazy load, etc.)
├── articles/           # Individual article pages
│   └── *.html
└── assets/
    ├── favicon.svg     # Favicon
    ├── manifest.json   # PWA manifest
    └── images/         # Article images, author photo
```

## Features

- **Static-first:** Deploy anywhere (Netlify, Vercel, GitHub Pages, Cloudflare Pages)
- **Accessible:** WCAG 2.1 AA, semantic HTML, proper focus management
- **Performant:** No JS framework, fonts preloaded, images lazy-loaded
- **Respectful:** No tracking, no cookies, privacy-friendly analytics optional
- **Newsletter-ready:** Accessible form with validation, ready for Buttondown/ConvertKit/Beehiiv
- **RSS:** Full-content feed at `/feed.xml`
- **PWA:** Manifest + offline-ready (add service worker if needed)

## Development

Just open `index.html` in a browser. Or serve locally:

```bash
# Python
python -m http.server 8000

# Node
npx serve .

# PHP
php -S localhost:8000
```

## Deployment

Push to any static host:

```bash
# Netlify
netlify deploy --prod --dir=blog

# Vercel
vercel --prod blog

# GitHub Pages
# Push to gh-pages branch or use Actions

# Cloudflare Pages
# Connect repo, build command: none, output: blog
```

## Customization

1. **Publication name:** Edit `header__brand` in all HTML files
2. **Author info:** Edit `about.html` and article author sections
3. **Newsletter:** Replace form `action` with your provider's endpoint (Buttondown, ConvertKit, Beehiiv, etc.)
4. **Analytics:** Add Plausible/Umami script to `<head>` if desired
5. **Colors:** Modify `css/tokens.css` CSS custom properties
6. **Fonts:** Change Google Fonts imports in HTML and `--font-*` variables in `tokens.css`

## Adding Articles

1. Create `articles/your-article-slug.html` using `articles/the-art-of-slow-reading.html` as template
2. Update `index.html` lead article and recent list
3. Add entry to `archive.html` under appropriate year
4. Add tags to `tags.html` cloud and tag sections
5. Add `<item>` to `feed.xml`
6. Add Open Graph / Twitter Card meta tags to article

## License

MIT — Use this as a starter for your own blog.