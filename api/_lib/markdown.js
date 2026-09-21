/**
 * Tiny, dependency-free converter from a friendly plain-text/markdown-ish
 * format to the HTML the blog's article styles expect. It is intentionally
 * small — it covers the constructs used across the existing essays:
 *
 *   ## Heading            -> <h2>
 *   ### Subheading        -> <h3>
 *   > quote               -> <blockquote>
 *   - item                -> <ul><li>
 *   blank-line paragraphs -> <p>
 *   **bold**  *italic*  [text](https://url)  -> inline formatting
 *
 * All text is HTML-escaped first, so pasted prose can't inject markup; only
 * the whitelisted inline patterns above are turned back into tags.
 */

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function inline(text) {
  let out = escapeHtml(text);
  // Links: [label](http...)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, href) => `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
  );
  // Bold then italic.
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return out;
}

export function toHtml(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  // Split into blocks on blank lines.
  const blocks = text.split(/\n{2,}/);
  const html = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const trimmed = block.trim();

    if (/^###\s+/.test(trimmed)) {
      html.push(`<h3>${inline(trimmed.replace(/^###\s+/, ''))}</h3>`);
    } else if (/^##\s+/.test(trimmed)) {
      html.push(`<h2>${inline(trimmed.replace(/^##\s+/, ''))}</h2>`);
    } else if (/^#\s+/.test(trimmed)) {
      html.push(`<h2>${inline(trimmed.replace(/^#\s+/, ''))}</h2>`);
    } else if (lines.every((l) => /^>\s?/.test(l))) {
      const quote = lines.map((l) => inline(l.replace(/^>\s?/, ''))).join(' ');
      html.push(`<blockquote>${quote}</blockquote>`);
    } else if (lines.every((l) => /^[-*]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`)
        .join('\n  ');
      html.push(`<ul>\n  ${items}\n</ul>`);
    } else {
      html.push(`<p>${inline(block.trim().replace(/\n/g, ' '))}</p>`);
    }
  }

  return html.join('\n\n');
}

/** Rough reading-time estimate (~200 wpm) from HTML or plain text. */
export function estimateReadMinutes(content) {
  const words = String(content || '')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Turn a title into a URL-safe slug. */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
