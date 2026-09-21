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
        </a>`;
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

    // Group by year, newest first.
    const byYear = new Map();
    for (const p of posts) {
      const year = new Date(p.published_at).getUTCFullYear();
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(p);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a);

    container.innerHTML = years
      .map((year, i) => {
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
      <section class="archive-year animate-fade-in-up delay-${Math.min(i + 1, 5)}" aria-labelledby="year-${year}">
        <h2 id="year-${year}" class="archive__year-heading">${year}</h2>
        <ul class="article-list" role="list">${rows}
        </ul>
      </section>`;
      })
      .join('\n');
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
    initHomepageList();
    initArchiveList();

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