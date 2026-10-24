/**
 * Pre-export page checks: reads the exported index.html as text and lists problems a visitor or a search engine
 * would notice (missing alt text, heading order, empty links, unlabelled fields, missing title/description).
 * Pure string work so it runs in the builder and in Node tests. Each issue: { id, severity, message, sectionId? }.
 */
(function (root) {
  'use strict';

  const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

  function stripNoise(html) {
    return String(html || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<template\b[\s\S]*?<\/template>/gi, '');
  }

  function attr(tag, name) {
    const m = new RegExp('\\s' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
    if (!m) return null;
    return m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
  }

  function hasAttr(tag, name) {
    return new RegExp('\\s' + name + '(\\s|=|>|/)', 'i').test(tag);
  }

  function visibleText(inner) {
    return inner.replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Splits the body into { id, slug, html } chunks, one per `<section class="page-section">`. */
  function splitSections(html) {
    const out = [];
    const re = /<section\b[^>]*\bclass="[^"]*\bpage-section\b[^"]*"[^>]*>/gi;
    const starts = [];
    let m;
    while ((m = re.exec(html))) starts.push({ index: m.index, tag: m[0] });
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : html.length;
      out.push({ id: attr(s.tag, 'id') || '', slug: attr(s.tag, 'data-section-slug') || '', html: html.slice(s.index, end) });
    });
    return out;
  }

  /** `altFixed` maps a section id to the number of pictures whose description is set in the Content tab (applied when the page loads, so it is not in the markup). */
  function checkPage(indexHtml, page = {}, altFixed = {}) {
    const issues = [];
    const add = (id, severity, message, sec) => issues.push({ id, severity, message, sectionId: sec && sec.id || undefined, slug: sec && sec.slug || undefined });
    const clean = stripNoise(indexHtml);

    if (!String(page.title || '').trim() || /^Assembled Web Page$/i.test(String(page.title).trim())) {
      add('page-title', 'warning', 'The page still has the default title. Set a real one in Page Settings.');
    }
    if (!String(page.description || '').trim()) {
      add('page-description', 'warning', 'No meta description. Search results will show random page text.');
    }
    if (!/<html\b[^>]*\blang=/i.test(indexHtml)) add('html-lang', 'warning', 'The <html> tag has no lang attribute.');

    const sections = splitSections(clean);
    const scopes = sections.length ? sections : [{ id: '', slug: '', html: clean }];

    // headings
    const headings = [];
    scopes.forEach(sec => {
      const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
      let m;
      while ((m = re.exec(sec.html))) headings.push({ level: Number(m[1]), text: visibleText(m[2]), sec });
    });
    const h1s = headings.filter(h => h.level === 1);
    if (h1s.length === 0) add('h1-missing', 'warning', 'The page has no <h1> heading.');
    if (h1s.length > 1) add('h1-multiple', 'info', `The page has ${h1s.length} <h1> headings; one is usual.`, h1s[1].sec);
    let prev = 0;
    headings.forEach(h => {
      if (prev && h.level > prev + 1) add('heading-skip', 'info', `Heading level jumps from h${prev} to h${h.level} ("${h.text.slice(0, 40)}").`, h.sec);
      prev = h.level;
    });
    headings.filter(h => !h.text).forEach(h => add('heading-empty', 'warning', `An empty <h${h.level}> heading.`, h.sec));

    scopes.forEach(sec => {
      // images
      let altCredit = altFixed[sec.id] || 0;
      (sec.html.match(/<img\b[^>]*>/gi) || []).forEach(tag => {
        if (!hasAttr(tag, 'alt') || ((attr(tag, 'alt') || '').trim() === '' && altCredit > 0)) {
          if (altCredit > 0) { altCredit--; return; }
          if (!hasAttr(tag, 'alt')) add('img-alt', 'error', 'An image has no alt attribute.', sec);
          else add('img-alt-empty', 'info', 'An image has empty alt text (fine only if it is purely decorative).', sec);
          return;
        }
        if (!hasAttr(tag, 'alt')) add('img-alt', 'error', 'An image has no alt attribute.', sec);
        else if ((attr(tag, 'alt') || '').trim() === '' && attr(tag, 'role') !== 'presentation' && attr(tag, 'aria-hidden') !== 'true') {
          add('img-alt-empty', 'info', 'An image has empty alt text (fine only if it is purely decorative).', sec);
        }
      });
      // links
      const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = linkRe.exec(sec.html))) {
        const tag = '<a' + m[1] + '>';
        const named = visibleText(m[2]) || attr(tag, 'aria-label') || attr(tag, 'title') || /<img\b[^>]*\balt="[^"]+"/i.test(m[2]);
        if (!named) add('link-name', 'error', 'A link has no readable text or aria-label.', sec);
        const href = (attr(tag, 'href') || '').trim();
        if (href === '#' || /^javascript:/i.test(href)) add('link-empty', 'warning', `A link goes nowhere (href="${href}").`, sec);
      }
      // buttons
      const btnRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
      while ((m = btnRe.exec(sec.html))) {
        const tag = '<button' + m[1] + '>';
        if (!visibleText(m[2]) && !attr(tag, 'aria-label') && !attr(tag, 'title') && !attr(tag, 'aria-labelledby')) add('button-name', 'error', 'A button has no text or aria-label.', sec);
      }
      // form fields
      const labelFor = new Set();
      (sec.html.match(/<label\b[^>]*>/gi) || []).forEach(t => { const f = attr(t, 'for'); if (f) labelFor.add(f); });
      const wrapped = (sec.html.match(/<label\b[^>]*>[\s\S]*?<\/label>/gi) || []).join(' ');
      (sec.html.match(/<(input|select|textarea)\b[^>]*>/gi) || []).forEach(tag => {
        const type = (attr(tag, 'type') || 'text').toLowerCase();
        if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return;
        const id = attr(tag, 'id');
        const labelled = attr(tag, 'aria-label') || attr(tag, 'aria-labelledby') || attr(tag, 'title') || (id && labelFor.has(id)) || wrapped.includes(tag);
        if (!labelled) add('field-label', 'warning', `A form field (${type}) has no label${attr(tag, 'placeholder') ? ' (a placeholder is not a label)' : ''}.`, sec);
      });
    });

    return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  const api = { checkPage, splitSections };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PageChecks = api;
})(typeof window !== 'undefined' ? window : this);
