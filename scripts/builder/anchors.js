/**
 * Anchor names for the sections of a page (plan: docs/superpowers/plans/2026-10-29-header-links.md, step 1).
 * A menu link such as "#pricing" needs something on the exported page called "pricing". Section ids are random
 * ("sec-ab12cd") and the builder, the checks and the multi-page router rely on them, so each section gets a separate
 * human name instead: the one set on the section (`anchor`), else a word for its kind of block ("prices" is "pricing"),
 * else its title.
 *   BuilderAnchors.assign(sections, { reserved, titleOf, categoryOf }) -> { [sectionId]: name }
 *   BuilderAnchors.clean(text) -> a safe name ('' when nothing usable is left)
 * Pure string work so it runs in the builder and in Node tests.
 */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./block-kinds.js') : root.BuilderBlockKinds);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BuilderAnchors = api;
})(typeof self !== 'undefined' ? self : this, function (BlockKinds) {
  'use strict';

  /** The word a visitor expects in the address for each everyday kind of block (ids from scripts/builder/block-kinds.js). */
  const KIND_WORD = { banner: 'home', about: 'about', services: 'services', prices: 'pricing', gallery: 'gallery', reviews: 'reviews', faq: 'faq', contact: 'contact', map: 'location', newsletter: 'newsletter', team: 'team', process: 'how-it-works' };
  /** By category, for the blocks that are not one of the everyday kinds. */
  const CATEGORY_WORD = { 'Headers & Nav': 'header', 'Footers & Endings': 'footer' };
  /** Always taken: "#top" scrolls to the top of any page, and "#home" is the first page of a multi-page site. */
  const ALWAYS_RESERVED = ['top'];
  const MAX = 40;

  /** Lower case, letters and digits joined by "-": accents are dropped ("Café" is "cafe"). */
  function clean(text) {
    return String(text == null ? '' : text)
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/<[^>]*>/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, MAX).replace(/-+$/g, '');
  }

  function defaultName(section, o) {
    const kind = BlockKinds && BlockKinds.kindOf ? BlockKinds.kindOf(section.slug) : null;
    if (kind && KIND_WORD[kind.id]) return KIND_WORD[kind.id];
    if (CATEGORY_WORD[categoryOf(section, o)]) return CATEGORY_WORD[categoryOf(section, o)];
    return clean(o.titleOf ? o.titleOf(section) : section.title) || clean(section.slug) || 'section';
  }

  /** A stack item does not always carry its category: `categoryOf` (optional) looks it up. */
  const categoryOf = (s, o) => String(s.category || (o.categoryOf && o.categoryOf(s)) || '');
  const isPreloader = (s, o) => /preloader/i.test(String(s.slug || '')) || /preloader/i.test(categoryOf(s, o));

  /**
   * One name per section (hidden sections and preloaders get none). A name set by the client is kept as long as nobody
   * else has it; every other clash gets "-2", "-3"... `reserved` lists names that mean something else on this page
   * (the keys of the other pages of a single-file site, whose address is also "#<key>").
   */
  function assign(sections, opts) {
    const o = opts || {};
    const taken = new Set(ALWAYS_RESERVED.concat((o.reserved || []).map(clean)));
    const out = {};
    const list = (Array.isArray(sections) ? sections : []).filter(s => s && s.id && !s.hidden && !isPreloader(s, o));
    const give = (s, base) => {
      let name = base; let n = 2;
      while (taken.has(name)) name = base.slice(0, MAX - String(n).length - 1) + '-' + (n++);
      taken.add(name); out[s.id] = name;
    };
    list.forEach(s => { const mine = clean(s.anchor); if (mine && !taken.has(mine)) give(s, mine); });   // the client's own names first
    list.forEach(s => { if (!out[s.id]) give(s, clean(s.anchor) || defaultName(s, o)); });
    return out;
  }

  /** Other words for the same place on a page: a menu item "Customers" goes to the reviews section. */
  const LABEL_WORDS = {
    pricing: ['pricing'], prices: ['pricing'], price: ['pricing'], plans: ['pricing'], 'plans-pricing': ['pricing'],
    about: ['about'], 'about-us': ['about'], story: ['about'], 'our-story': ['about'], studio: ['about'],
    services: ['services'], 'what-we-do': ['services'], features: ['services'], product: ['services'], solutions: ['services'], offer: ['services'],
    work: ['gallery'], portfolio: ['gallery'], gallery: ['gallery'], projects: ['gallery'],
    reviews: ['reviews'], testimonials: ['reviews'], customers: ['reviews'], clients: ['reviews'],
    faq: ['faq'], questions: ['faq'], help: ['faq'],
    contact: ['contact'], 'contact-us': ['contact'], 'say-hello': ['contact'], 'get-in-touch': ['contact'], 'book-a-visit': ['contact'], 'request-an-invite': ['contact'],
    team: ['team'], people: ['team'],
    process: ['how-it-works'], method: ['how-it-works'], 'how-we-work': ['how-it-works'], 'how-it-works': ['how-it-works'],
    newsletter: ['newsletter'], subscribe: ['newsletter'],
    location: ['location'], 'find-us': ['location'], visit: ['location'], hours: ['location']
  };

  /** The anchor a menu item with this text most likely means, or '' when the page has no such section. `names` lists the anchors on the page. */
  function matchLabel(label, names) {
    const have = new Set(names || []);
    const word = clean(label).replace(/^\d+-/, ''); // "02 About" is "about"
    if (!word) return '';
    return [word].concat(LABEL_WORDS[word] || []).find(n => have.has(n)) || '';
  }

  /**
   * Gives every menu item (an <a data-edv-nav>) that still goes nowhere ("#") the address of the section its text names.
   * An address that was set is left alone, and so is an item nothing matches. Works on a block's markup, before the
   * client's own link edits are applied on top, so those always win.
   */
  function linkNav(html, names) {
    if (!names || !names.length) return html;
    return String(html).replace(/<a\b[^>]*\sdata-edv-nav\b[^>]*>[\s\S]*?<\/a>/gi, (tag) => {
      const open = tag.slice(0, tag.indexOf('>') + 1);
      if (!/\shref="#?"/i.test(open)) return tag;
      const label = tag.slice(open.length, -4).replace(/<[^>]*>/g, ' ');
      const hit = matchLabel(label, names);
      return hit ? open.replace(/(\shref=)"#?"/i, '$1"#' + hit + '"') + tag.slice(open.length) : tag;
    });
  }

  /** The menu items (their data-edv-nav numbers) that have an address set in the admin panel: those edits are applied when the page loads, so they are not in the markup. */
  function linkedItems(overrides) {
    const out = new Set();
    Object.values(overrides || {}).forEach(o => {
      if (!o || o.type !== 'link' || !String(o.value == null ? '' : o.value).trim() || String(o.value).trim() === '#') return;
      const m = /data-edv-nav="(\d+)"/.exec(String(o.selector || ''));
      if (m) out.add(m[1]);
    });
    return out;
  }

  /**
   * Takes out the menu items (<a data-edv-nav>) that still go nowhere ("#" or nothing) and are not linked in `keep`
   * (see linkedItems), with the list item around them and any list left empty. A menu item that goes nowhere is worse
   * than a missing one. Returns { html, hidden: [text of each item taken out] }.
   */
  function hideUnlinked(html, keep) {
    const hidden = [];
    const isOpen = (tag) => /\shref="#?"/i.test(tag.slice(0, tag.indexOf('>') + 1)) || !/\shref=/i.test(tag.slice(0, tag.indexOf('>') + 1));
    const item = (tag) => {
      const num = (/\sdata-edv-nav="(\d+)"/.exec(tag) || [])[1];
      if (!isOpen(tag) || (keep && keep.has(num))) return null;
      return tag.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'a menu item';
    };
    const anchor = '<a\\b[^>]*\\sdata-edv-nav="\\d+"[^>]*>[\\s\\S]*?<\\/a>';
    let out = String(html).replace(new RegExp('<li\\b[^>]*>\\s*(' + anchor + ')\\s*<\\/li>', 'gi'), (all, a) => {
      const t = item(a); if (t === null) return all; hidden.push(t); return '';
    });
    out = out.replace(new RegExp(anchor, 'gi'), (a) => {
      const t = item(a); if (t === null) return a; hidden.push(t); return '';
    });
    if (hidden.length) out = out.replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/gi, '');
    return { html: out, hidden };
  }

  const HIDDEN_NOTE = 'edv-nav-hidden:';
  /** A note the page checks read: which items were left out of the section. Safe inside an HTML comment. */
  function hiddenNote(items) {
    return '<!-- ' + HIDDEN_NOTE + ' ' + items.map(t => t.replace(/[<>&-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)).join(' | ') + ' -->\n';
  }

  /** A note for the page checks: sections that did not fit the automatic menu. */
  function overflowNote(items) {
    return '<!-- edv-menu-overflow: ' + items.map(t => String(t).replace(/[<>&-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40)).join(' | ') + ' -->\n';
  }

  return { assign, clean, matchLabel, overflowNote, linkNav, linkedItems, hideUnlinked, hiddenNote, HIDDEN_NOTE, KIND_WORD };
});
