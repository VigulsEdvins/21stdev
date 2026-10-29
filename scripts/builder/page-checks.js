/**
 * Pre-export page checks: reads the exported index.html as text and lists problems a visitor or a search engine
 * would notice (missing alt text, heading order, empty links, unlabelled fields, missing title/description).
 * Pure string work so it runs in the builder and in Node tests. Each issue: { id, severity, message, sectionId? }.
 */
(function (root) {
  'use strict';

  const FD = typeof module !== 'undefined' && module.exports ? require('../form-delivery.js') : root.FormDelivery;
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
  function checkPage(indexHtml, page = {}, altFixed = {}, linkFixed = {}) {
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
    const delivery = FD ? FD.fromPage(page) : { method: '', ok: true };
    let badDeliveryShown = false;

    const pageIds = new Set((clean.match(/\sid\s*=\s*["']([^"']+)["']/gi) || []).map(t => t.replace(/^\s*id\s*=\s*["']/i, '').slice(0, -1)));
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
        if ((href === '#' || /^javascript:/i.test(href)) && !hasAttr(tag, 'data-edv-cta')) add('link-empty', 'warning', `A link goes nowhere (href="${href}").`, sec);
      }
      // plan / call-to-action buttons (data-edv-cta) must lead somewhere: a link set in the admin panel counts, the markup's own "#" or an anchor nothing on the page has does not
      let linkCredit = linkFixed[sec.id] || 0;
      (sec.html.match(/<a\b[^>]*\sdata-edv-cta\b[^>]*>/gi) || []).forEach(tag => {
        const href = (attr(tag, 'href') || '').trim();
        const goesNowhere = !href || href === '#' || (href.charAt(0) === '#' && !pageIds.has(href.slice(1)));
        if (!goesNowhere) return;
        if (linkCredit > 0) { linkCredit--; return; }
        add('cta-no-link', 'warning', 'A plan button does not lead anywhere yet. Open the admin panel (Content tab) and set “button link” on each plan to your payment or sign-up page.', sec);
      });
      // buttons
      const btnRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
      while ((m = btnRe.exec(sec.html))) {
        const tag = '<button' + m[1] + '>';
        if (!visibleText(m[2]) && !attr(tag, 'aria-label') && !attr(tag, 'title') && !attr(tag, 'aria-labelledby')) add('button-name', 'error', 'A button has no text or aria-label.', sec);
      }
      // forms: a static page cannot process a form, so one without a target address goes nowhere
      // (a choice in the admin panel's Form messages tab counts as a target; the export applies it)
      (sec.html.match(/<form\b[^>]*>/gi) || []).forEach(tag => {
        const act = (attr(tag, 'action') || '').trim();
        const marker = attr(tag, 'data-edv-form');
        if (marker === 'skip' || (act && act !== '#')) return;
        if (marker === 'message' && delivery.method && delivery.ok) return;
        if (marker === 'message' && delivery.method) {
          if (!badDeliveryShown) { badDeliveryShown = true; add('form-delivery-invalid', 'error', 'Where form messages go is set in the admin panel (Form messages), but: ' + delivery.error, sec); }
          return;
        }
        add('form-no-target', 'warning', 'A form has no address to send to. A page made of plain files cannot receive messages: choose where messages go in the admin panel under Form messages (Netlify Forms, your email, WhatsApp or a form service), or replace the form with an email link.', sec);
      });
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

  /**
   * "Ready for Google" list (plan E7.7): what to settle before the page goes online. Kept apart from checkPage so the
   * everyday check stays about the page itself. Same issue shape.
   */
  function checkSearchReady(indexHtml, page = {}) {
    const issues = [];
    const add = (id, severity, message) => issues.push({ id, severity, message });
    const html = String(indexHtml || '');
    const clean = stripNoise(html);
    const title = String(page.title || '').trim();
    const desc = String(page.description || '').trim();
    if (page.robots === 'noindex') add('noindex', 'error', 'This page asks search engines NOT to list it ("noindex"). Turn that off in Page Settings or Google will never show it.');
    const canon = String(page.canonical || '').trim();
    if (/^http:\/\/[^\s"'<>]+$/i.test(canon)) add('address-not-https', 'warning', 'Your web address starts with http://. Use https:// so visitors see the padlock.');
    else if (!/^https:\/\/[^\s"'<>]+$/i.test(canon)) add('address-missing', 'warning', 'Your web address is not set. Without it the download has no sitemap and no canonical link. Type it above, or set it after the site is online and download again.');
    if (title.length > 60) add('title-long', 'info', 'The page title is long (' + title.length + ' characters). Search results cut it off at about 60.');
    if (desc.length > 160) add('description-long', 'info', 'The page description is long (' + desc.length + ' characters). Search results cut it off at about 160.');
    if (!/^https:\/\/[^\s"'<>]+$/i.test(String(page.shareImage || '').trim())) add('share-image', 'info', 'No share picture is set, so links to your page look plain when shared.');
    if (!String(page.lang || '').trim()) add('lang-missing', 'warning', 'The page language is not set.');
    if (page.bizType && !String(page.bizName || '').trim()) add('ld-name', 'info', 'You chose a business type but no business name, so no business data is written for search engines.');
    const text = visibleText(clean);
    const digits = (v) => String(v || '').replace(/\D/g, '');
    if (String(page.bizPhone || '').trim() && !digits(clean).includes(digits(page.bizPhone)) && !/href="tel:/i.test(clean)) add('contact-phone', 'info', 'The business phone in Page Settings does not appear on the page. Visitors and search engines should see the same number.');
    if (String(page.bizEmail || '').trim() && !text.includes(String(page.bizEmail).trim()) && !clean.includes('mailto:' + String(page.bizEmail).trim())) add('contact-email', 'info', 'The business email in Page Settings does not appear on the page. Visitors and search engines should see the same address.');
    return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  /** Per section: how many pictures got a description, and how many links got an address, in the Content tab / admin panel (applied when the page loads, so not in the markup). */
  function overrideCounts(stack) {
    const alt = {}, link = {};
    (stack || []).forEach(s => {
      const vals = Object.values(s.overrides || {}).filter(o => o && o.value);
      const a = vals.filter(o => o.type === 'alt').length;
      const l = vals.filter(o => o.type === 'link' && String(o.value).trim() !== '#').length;
      if (a) alt[s.id] = a;
      if (l) link[s.id] = l;
    });
    return { alt, link };
  }

  const api = { checkPage, checkSearchReady, splitSections, overrideCounts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PageChecks = api;
})(typeof window !== 'undefined' ? window : this);
