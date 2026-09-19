# Public Blog

A personal blog built with static HTML/CSS/JS — zero build step, zero framework, zero dependencies.

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