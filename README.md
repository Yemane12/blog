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

### Accounts, authors, and publishing

Authentication uses **Supabase Auth** (email + password). Roles live in the `profiles`
table: `reader` (default), `author`, `admin`.

- **Sign in / sign up:** `/login.html` (also a **Sign in** link in the nav).
- **New users** start as `reader` and can only read. An **admin** approves them as an
  `author` before they can publish.
- **Dashboard:** `/admin.html`
  - Authors write/edit/delete **their own** posts (plain text or light markdown:
    `## Heading`, `> quote`, `- list`, `**bold**`, `[link](https://…)`).
  - Admins also see an **Authors** panel to approve/promote users, and can manage every post.
- The owner email (`michaeltekie92@gmail.com`) is bootstrapped as `admin` on first sign-up.
  Change or add admins with SQL:
  ```sql
  update public.profiles set role = 'admin' where email = 'someone@example.com';
  ```

**Row Level Security** enforces everything: published posts are world-readable; only approved
authors can insert; authors can update/delete only their own posts; admins can manage all.

**API** (all require a Supabase session — send `Authorization: Bearer <access_token>`):
- `GET  /api/me` — current user + role
- `POST /api/publish` — create/update one of your posts
- `GET  /api/admin/list` — your posts (or all, for admins)
- `GET  /api/admin/get?slug=…` — one full post (for editing)
- `POST /api/admin/set-published` — `{ slug, is_published }`
- `POST /api/admin/delete` — `{ slug }`
- `GET  /api/admin/authors` — list users (admin only)
- `POST /api/admin/set-role` — `{ id, role }` (admin only)

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