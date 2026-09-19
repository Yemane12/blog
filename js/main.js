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
          // Simulate API call - replace with actual endpoint
          await simulateSubscribe(emailInput.value);

          // Success
          showSuccess('Thanks for subscribing! Check your inbox for a confirmation.');
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

  // Simulate API call - REPLACE WITH REAL ENDPOINT
  function simulateSubscribe(email) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional failure for testing
        if (Math.random() < 0.05) {
          reject(new Error('Network error. Please try again.'));
        } else {
          console.log('[Newsletter] Subscribed:', email);
          resolve();
        }
      }, 800);
    });
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
    const toggle = $('#theme-toggle');
    if (!toggle) return;

    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme');

    // Apply saved theme on load
    if (savedTheme) {
      html.setAttribute('data-theme', savedTheme);
      toggle.setAttribute('aria-pressed', savedTheme === 'dark');
    }

    toggle.addEventListener('click', () => {
      const isDark = html.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';

      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      toggle.setAttribute('aria-pressed', newTheme === 'dark');
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
    initReadingProgress();
    initThemeToggle();

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