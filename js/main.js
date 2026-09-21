/**
 * Public Blog — Main JavaScript
 * Swiss Modernism 2.0 — Progressive Enhancement Only
 * No framework, no build step, vanilla ES modules
 */

(function() {
  'use strict';

  // ============================================================
  // UTILITIES
  // ============================================================

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(null, args), delay);
    };
  };

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ============================================================
  // NEWSLETTER FORM
  // ============================================================

  function initNewsletterForm() {
    const forms = $$('#newsletter-form');
    if (!forms.length) return;

    forms.forEach(form => {
      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');
      const errorEl = form.querySelector('[id$="-error"]');
      const successEl = form.querySelector('[id$="-success"]');

      if (!emailInput || !submitBtn) return;

      // Real-time validation feedback
      emailInput.addEventListener('input', debounce(() => {
        if (emailInput.validity.valid) {
          emailInput.setAttribute('aria-invalid', 'false');
          hideError();
        } else if (emailInput.value.length > 0) {
          emailInput.setAttribute('aria-invalid', 'true');
          showError(getErrorMessage(emailInput));
        }
      }, 300));

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!emailInput.validity.valid) {
          emailInput.setAttribute('aria-invalid', 'true');
          showError(getErrorMessage(emailInput));
          emailInput.focus();
          return;
        }

        // Hide previous messages
        hideError();
        hideSuccess();

        // Disable during submit
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Subscribing...';

        try {
          // Real API call to the Supabase-backed serverless function
          const message = await subscribeEmail(emailInput.value);

          // Success
          showSuccess(message || 'Thanks for subscribing! Check your inbox for a confirmation.');
          form.reset();
          emailInput.setAttribute('aria-invalid', 'false');

          // Track conversion (privacy-friendly)
          if (window.plausible) {
            window.plausible('newsletter_subscribe', { props: { source: window.location.pathname } });
          }
        } catch (err) {
          showError(err.message || 'Something went wrong. Please try again.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });

      function getErrorMessage(input) {
        if (input.validity.valueMissing) return 'Email address is required';
        if (input.validity.typeMismatch) return 'Please enter a valid email address';
        return 'Invalid email address';
      }

      function showError(message) {
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.hidden = false;
        }
      }

      function hideError() {
        if (errorEl) errorEl.hidden = true;
      }

      function showSuccess(message) {
        if (successEl) {
          successEl.textContent = message;
          successEl.hidden = false;
        }
      }

      function hideSuccess() {
        if (successEl) successEl.hidden = true;
      }
    });
  }

  // Real newsletter subscribe — posts to the Supabase-backed API.
  async function subscribeEmail(email) {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: window.location.pathname }),
    });

    let payload = {};
    try {
      payload = await res.json();
    } catch (_) {
      /* ignore non-JSON responses */
    }

    if (!res.ok) {
      throw new Error(payload.error || 'Something went wrong. Please try again.');
    }
    return payload.message;
  }

  // ============================================================
  // DYNAMIC POST LIST (HOMEPAGE + ARCHIVE) — from Supabase via /api/posts
  // ============================================================

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatShort(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
  }

  function formatLong(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  }

  function escapeHtml(s = '') {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Small share row placed as a SIBLING of a card link (never nested inside
  // the <a>, which would be invalid). Social links open in a new tab; the
  // copy button copies the article URL.
  const SHARE_ICONS = {
    x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>',
    facebook: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    linkedin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>',
    link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>',
  };

  function cardShareRow(post) {
    const url = (window.location.origin || '') + '/articles/' + encodeURIComponent(post.slug);
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(post.title || '');
    return `
          <div class="card-share" data-share-url="${escapeHtml(url)}">
            <a class="card-share__btn" href="https://twitter.com/intent/tweet?text=${t}&url=${u}" target="_blank" rel="noopener" aria-label="Share on X">${SHARE_ICONS.x}</a>
            <a class="card-share__btn" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" aria-label="Share on Facebook">${SHARE_ICONS.facebook}</a>
            <a class="card-share__btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${SHARE_ICONS.linkedin}</a>
            <button type="button" class="card-share__btn card-share__copy" aria-label="Copy link">${SHARE_ICONS.link}</button>
          </div>`;
  }

  function initCardShare() {
    document.addEventListener('click', async (e) => {
      const copyBtn = e.target.closest && e.target.closest('.card-share__copy');
      if (!copyBtn) return;
      e.preventDefault();
      const row = copyBtn.closest('.card-share');
      const url = row && row.getAttribute('data-share-url');
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
      } catch (_) {
        const tmp = document.createElement('input');
        tmp.value = url; document.body.appendChild(tmp); tmp.select();
        try { document.execCommand('copy'); } catch (_) {}
        tmp.remove();
      }
      copyBtn.classList.add('is-copied');
      copyBtn.setAttribute('aria-label', 'Link copied');
      setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        copyBtn.setAttribute('aria-label', 'Copy link');
      }, 1400);
    });
  }

  async function initHomepageList() {
    const leadContainer = $('#dynamic-lead');
    const listContainer = $('#dynamic-list');
    if (!leadContainer && !listContainer) return;

    let posts;
    try {
      const res = await fetch('/api/posts');
      if (!res.ok) return; // Leave the static fallback markup in place.
      const data = await res.json();
      posts = data.posts;
    } catch (_) {
      return; // Offline / API unavailable — keep static content.
    }
    if (!Array.isArray(posts) || posts.length === 0) return;

    const [lead, ...rest] = posts;

    if (leadContainer && lead) {
      leadContainer.innerHTML = `
        <a href="/articles/${encodeURIComponent(lead.slug)}" class="article-teaser article-lead">
          ${lead.cover_image ? `<img class="article-lead__cover" src="${escapeHtml(lead.cover_image)}" alt="" loading="lazy">` : ''}
          <div class="article-teaser__meta">
            <time datetime="${escapeHtml(lead.published_at)}">${formatLong(lead.published_at)}</time>
            <span aria-hidden="true">·</span>
            <span>${Number(lead.read_minutes) || 5} min read</span>
          </div>
          <h2 class="article-teaser__headline">${escapeHtml(lead.title)}</h2>
          <p class="article-lead__dek">${escapeHtml(lead.dek || '')}</p>
          <p class="article-teaser__excerpt">${escapeHtml(lead.excerpt || '')}</p>
        </a>
        ${cardShareRow(lead)}`;
    }

    if (listContainer) {
      const listPosts = leadContainer ? rest : posts;
      const items = listPosts.map(
        (p) => `
        <li>
          <a href="/articles/${encodeURIComponent(p.slug)}" class="article-list__item">
            ${p.cover_image ? `<img class="article-list__thumb" src="${escapeHtml(p.cover_image)}" alt="" loading="lazy">` : ''}
            <div class="article-list__body">
              <time class="article-list__meta" datetime="${escapeHtml(p.published_at)}">${formatShort(p.published_at)}</time>
              <h3 class="article-list__headline">${escapeHtml(p.title)}</h3>
            </div>
          </a>
          ${cardShareRow(p)}
        </li>`
      );

      // In-feed sponsors: place an ad between posts (after every 3rd).
      const ads = await fetchAds();
      if (ads.length) {
        const withAds = [];
        let adIdx = 0;
        items.forEach((li, i) => {
          withAds.push(li);
          // After every 3rd post, drop in the next (unique) sponsor.
          if ((i + 1) % 3 === 0 && i < items.length - 1 && adIdx < ads.length) {
            withAds.push(infeedAdHtml(ads[adIdx++]));
          }
        });
        listContainer.innerHTML = withAds.join('');
      } else {
        listContainer.innerHTML = items.join('');
      }
    }
  }

  async function fetchAds(placement = 'home') {
    try {
      const res = await fetch('/api/ads?placement=' + encodeURIComponent(placement));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.ads) ? data.ads : [];
    } catch (_) {
      return [];
    }
  }

  function infeedAdHtml(ad) {
    const href = ad.link_url ? escapeHtml(ad.link_url) : '#';
    const img = ad.image_url
      ? `<img class="ad-card__img" src="${escapeHtml(ad.image_url)}" alt="" loading="lazy">`
      : '';
    const body = ad.body ? `<p class="ad-card__text">${escapeHtml(ad.body)}</p>` : '';
    let domain = '';
    try { if (ad.link_url) domain = new URL(ad.link_url).hostname.replace(/^www\./, ''); } catch (_) {}
    const cta = domain ? `<span class="ad-card__cta">${escapeHtml(domain)} &rarr;</span>` : '';
    return `
      <li class="ad-infeed" aria-label="Sponsored">
        <a class="ad-card ad-card--infeed" href="${href}" target="_blank" rel="noopener sponsored nofollow">
          ${img}
          <div class="ad-card__body">
            <span class="ad-card__chip">Sponsored</span>
            <p class="ad-card__title">${escapeHtml(ad.title)}</p>
            ${body}
            ${cta}
          </div>
        </a>
      </li>`;
  }

  function renderArchive(container, posts) {
    if (!posts.length) {
      container.innerHTML = '<p class="hint" style="opacity:.7;">No articles match your search.</p>';
      return;
    }
    const byYear = new Map();
    for (const p of posts) {
      const year = new Date(p.published_at).getUTCFullYear();
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(p);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a);
    container.innerHTML = years
      .map((year) => {
        const rows = byYear
          .get(year)
          .map(
            (p) => `
          <li>
            <a href="/articles/${encodeURIComponent(p.slug)}" class="article-list__item">
              <time class="article-list__meta" datetime="${escapeHtml(p.published_at)}">${formatShort(p.published_at)}</time>
              <h3 class="article-list__headline">${escapeHtml(p.title)}</h3>
            </a>
          </li>`
          )
          .join('');
        return `
      <section class="archive-year" aria-labelledby="year-${year}">
        <h2 id="year-${year}" class="archive__year-heading">${year}</h2>
        <ul class="article-list" role="list">${rows}
        </ul>
      </section>`;
      })
      .join('\n');
  }

  async function initArchiveList() {
    const container = $('#dynamic-archive');
    if (!container) return;

    let posts;
    try {
      const res = await fetch('/api/posts?limit=100');
      if (!res.ok) return; // Keep static fallback.
      const data = await res.json();
      posts = data.posts;
    } catch (_) {
      return;
    }
    if (!Array.isArray(posts) || posts.length === 0) return;

    renderArchive(container, posts);

    // Wire the search box (progressive enhancement).
    const wrap = $('#archive-search-wrap');
    const input = $('#archive-search');
    const status = $('#archive-search-status');
    if (wrap && input) {
      wrap.hidden = false;
      const matches = (p, q) => {
        const hay = [p.title, p.dek, p.excerpt, (p.tags || []).join(' ')].join(' ').toLowerCase();
        return hay.includes(q);
      };
      const run = () => {
        const q = input.value.trim().toLowerCase();
        const filtered = q ? posts.filter((p) => matches(p, q)) : posts;
        renderArchive(container, filtered);
        if (status) {
          status.textContent = q
            ? `${filtered.length} of ${posts.length} article(s) match “${input.value.trim()}”.`
            : '';
        }
      };
      input.addEventListener('input', debounce(run, 150));
    }
  }

  // ============================================================
  // TAGS PAGE (DB-driven cloud + per-tag lists)
  // ============================================================

  function tagSlug(t) {
    return String(t).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function initTagsPage() {
    const container = $('#dynamic-tags');
    if (!container) return;

    let posts;
    try {
      const res = await fetch('/api/posts?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      posts = data.posts;
    } catch (_) {
      return;
    }
    if (!Array.isArray(posts) || posts.length === 0) return;

    // Group posts by tag.
    const byTag = new Map();
    for (const p of posts) {
      for (const t of p.tags || []) {
        if (!byTag.has(t)) byTag.set(t, []);
        byTag.get(t).push(p);
      }
    }
    if (byTag.size === 0) { container.innerHTML = '<p class="hint">No topics yet.</p>'; return; }

    // Sort tags by post count, then alphabetically.
    const tags = [...byTag.keys()].sort((a, b) => byTag.get(b).length - byTag.get(a).length || a.localeCompare(b));

    const cloud = tags
      .map((t) => `<a href="#${tagSlug(t)}" class="article__tag" role="listitem">${escapeHtml(t)} (${byTag.get(t).length})</a>`)
      .join('\n        ');

    const sections = tags
      .map((t) => {
        const rows = byTag
          .get(t)
          .map(
            (p) => `<li><a href="/articles/${encodeURIComponent(p.slug)}" class="article-list__item"><time class="article-list__meta" datetime="${escapeHtml(p.published_at)}">${formatShort(p.published_at)}</time><h3 class="article-list__headline">${escapeHtml(p.title)}</h3></a></li>`
          )
          .join('\n          ');
        return `
      <section id="${tagSlug(t)}" class="tag-section" aria-labelledby="${tagSlug(t)}-heading">
        <h2 id="${tagSlug(t)}-heading" class="tag-section__title">${escapeHtml(t)}</h2>
        <ul class="article-list" role="list">
          ${rows}
        </ul>
      </section>`;
      })
      .join('\n');

    container.innerHTML =
      `<div class="tags-cloud" role="list" aria-label="Article topics">\n        ${cloud}\n      </div>\n${sections}`;

    // If the URL has a #tag, scroll to it now that content exists.
    if (window.location.hash) {
      const el = document.getElementById(window.location.hash.slice(1));
      if (el) el.scrollIntoView();
    }
  }

  // ============================================================
  // IN-ARTICLE TABLE OF CONTENTS (non-intrusive; only for long posts)
  // ============================================================

  function initArticleTOC() {
    const content = $('.article__content');
    if (!content) return;
    const headings = $$('h2, h3', content);
    if (headings.length < 3) return; // Not worth a TOC on short posts.

    const used = new Set();
    const items = headings.map((h) => {
      let id = h.id || tagSlug(h.textContent).slice(0, 60) || 'section';
      let unique = id;
      let n = 2;
      while (used.has(unique) || document.getElementById(unique)) { unique = id + '-' + n++; }
      used.add(unique);
      h.id = unique;
      const level = h.tagName.toLowerCase();
      return `<li class="toc__item toc__item--${level}"><a href="#${unique}" class="toc__link">${escapeHtml(h.textContent)}</a></li>`;
    });

    const nav = document.createElement('details');
    nav.className = 'toc';
    nav.open = true;
    nav.innerHTML = `<summary class="toc__title">Contents</summary><ul class="toc__list">${items.join('')}</ul>`;
    content.parentNode.insertBefore(nav, content);
  }

  // ============================================================
  // SMOOTH SCROLL POLYFILL FOR REDUCED MOTION
  // ============================================================

  function initSmoothScroll() {
    if (prefersReducedMotion()) return;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const targetId = link.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    });
  }

  // ============================================================
  // LAZY LOAD IMAGES (PROGRESSIVE ENHANCEMENT)
  // ============================================================

  function initLazyImages() {
    if (!('IntersectionObserver' in window)) return;

    const images = $$('img[loading="lazy"]');
    if (!images.length) return;

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.removeAttribute('loading');
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '50px 0px', threshold: 0.01 });

    images.forEach(img => imageObserver.observe(img));
  }

  // ============================================================
  // SCROLL REVEAL ANIMATIONS (RESPECTS REDUCED MOTION)
  // ============================================================

  function initScrollReveal() {
    if (prefersReducedMotion()) {
      // Immediately show all animated elements
      $$('.animate-fade-in-up, .animate-fade-in').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    if (!('IntersectionObserver' in window)) return;

    const animatedElements = $$('.animate-fade-in-up, .animate-fade-in');
    if (!animatedElements.length) return;

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    // Pause animations initially
    animatedElements.forEach(el => {
      el.style.animationPlayState = 'paused';
      revealObserver.observe(el);
    });
  }

  // ============================================================
  // ACTIVE NAV HIGHLIGHTING
  // ============================================================

  function initAccountNav() {
    const nav = $('.header__nav');
    if (!nav) return;
    // Skip pages that already expose an auth entry point (login/dashboard).
    if (nav.querySelector('a[href="/login.html"], a[href="/admin.html"]')) return;
    const link = document.createElement('a');
    link.href = '/login.html';
    link.className = 'header__nav-link';
    link.textContent = 'Sign in';
    nav.appendChild(link);
  }

  function initActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = $$('.header__nav-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // ============================================================
  // READING PROGRESS INDICATOR (ARTICLE PAGES)
  // ============================================================

  function initReadingProgress() {
    const progressBar = $('#reading-progress');
    if (!progressBar) return;

    const article = $('article.article');
    if (!article) return;

    const updateProgress = () => {
      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;

      const progress = Math.min(
        Math.max((scrollTop - articleTop + windowHeight * 0.1) / (articleHeight - windowHeight * 0.8), 0),
        1
      );

      progressBar.style.width = `${progress * 100}%`;
    };

    window.addEventListener('scroll', debounce(updateProgress, 16), { passive: true });
    window.addEventListener('resize', debounce(updateProgress, 100));
  }

  // ============================================================
  // THEME TOGGLE (OPTIONAL - IF USER WANTS MANUAL CONTROL)
  // ============================================================

  function initThemeToggle() {
    const nav = $('.header__nav');
    let toggle = $('#theme-toggle');
    if (!toggle) {
      if (!nav) return;
      toggle = document.createElement('button');
      toggle.id = 'theme-toggle';
      toggle.type = 'button';
      toggle.className = 'theme-toggle';
      toggle.setAttribute('aria-label', 'Toggle dark mode');
      nav.appendChild(toggle);
    }

    const html = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem('theme'); } catch (_) {}
    if (saved === 'dark' || saved === 'light') html.setAttribute('data-theme', saved);

    const effectiveDark = () => {
      const t = html.getAttribute('data-theme');
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    const updateIcon = () => {
      const dark = effectiveDark();
      toggle.innerHTML = dark ? '<span aria-hidden="true">☀</span>' : '<span aria-hidden="true">☾</span>';
      toggle.setAttribute('aria-pressed', String(dark));
    };
    updateIcon();

    toggle.addEventListener('click', () => {
      const newTheme = effectiveDark() ? 'light' : 'dark';
      html.setAttribute('data-theme', newTheme);
      try { localStorage.setItem('theme', newTheme); } catch (_) {}
      updateIcon();
    });
  }

  // ============================================================
  // BACK TO TOP (unobtrusive; appears only after scrolling)
  // ============================================================

  function initBackToTop() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    document.body.appendChild(btn);

    const onScroll = () => { btn.classList.toggle('is-visible', window.scrollY > 600); };
    window.addEventListener('scroll', debounce(onScroll, 100), { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function init() {
    // Core features
    initNewsletterForm();
    initSmoothScroll();
    initLazyImages();
    initScrollReveal();
    initActiveNav();
    initAccountNav();
    initReadingProgress();
    initThemeToggle();
    initBackToTop();
    initCardShare();
    initArticleTOC();
    initHomepageList();
    initArchiveList();
    initTagsPage();

    // Log initialization for debugging
    console.log('[Public Blog] Initialized — Swiss Modernism 2.0');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();