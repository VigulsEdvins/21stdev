/**
 * Automatic menu (plan: docs/superpowers/plans/2026-10-30-automatic-menu.md): a header lists the page's sections by itself.
 *   BuilderMenu.items(sections, names, { titleOf, categoryOf }) -> [{ id, label, anchor }]   which sections get an item, and with what text
 *   BuilderMenu.fill(html, items) -> { html, overflow: [labels that did not fit] }          writes the items into a header's markup
 * A header says where its menu goes with `data-edv-menu` (and `data-edv-menu-max="N"`) on the element that holds the
 * items; the first item inside is the pattern the others are copied from. Inside an item, `data-edv-label` marks the
 * element that holds the text (the whole link when nothing is marked), `data-edv-count` a running number ("01") and a
 * `--i:0` style a running index. An item marked `data-edv-keep` (a button in the list) is left where it is.
 * Pure string work so it runs in the builder and in Node tests.
 */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./block-kinds.js') : root.BuilderBlockKinds);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BuilderMenu = api;
})(typeof self !== 'undefined' ? self : this, function (BlockKinds) {
  'use strict';

  /** The everyday word for each kind of block (ids from scripts/builder/block-kinds.js). */
  const KIND_LABEL = { about: 'About', services: 'Services', prices: 'Pricing', gallery: 'Gallery', reviews: 'Reviews', faq: 'FAQ', contact: 'Contact', map: 'Find us', newsletter: 'Newsletter', team: 'Team', process: 'How it works' };
  const LABEL_MAX = 30;
  const squash = (t) => String(t == null ? '' : t).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LABEL_MAX).trim();
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /**
   * The sections that get a menu item, in page order. `names` maps a section id to its anchor name (BuilderAnchors.assign).
   * Left out: sections without an anchor (hidden, preloaders), headers and footers, sections switched off (`inMenu: false`),
   * and the opening banner (the logo already goes to the top).
   */
  function items(sections, names, opts) {
    const o = opts || {};
    const cat = (s) => String(s.category || (o.categoryOf && o.categoryOf(s)) || '');
    const out = [];
    let opening = true;
    (Array.isArray(sections) ? sections : []).forEach(s => {
      if (!s || !names || !names[s.id] || cat(s) === 'Headers & Nav') return;
      const kind = BlockKinds && BlockKinds.kindOf ? BlockKinds.kindOf(s.slug) : null;
      const isOpening = opening && cat(s) !== 'Footers & Endings' && ((kind && kind.id === 'banner') || cat(s) === 'Heroes');
      opening = false;
      if (isOpening || cat(s) === 'Footers & Endings' || s.inMenu === false) return;
      const label = squash(s.menuLabel) || (kind && KIND_LABEL[kind.id]) || squash(o.titleOf ? o.titleOf(s) : s.title) || squash(s.slug);
      if (label) out.push({ id: s.id, label, anchor: names[s.id] });
    });
    return out;
  }

  /** Opening and closing tags of the elements a list can be (one pattern each, so none is built from page text). */
  const TAGS = { nav: /<(\/?)nav\b[^>]*>/gi, ul: /<(\/?)ul\b[^>]*>/gi, ol: /<(\/?)ol\b[^>]*>/gi, div: /<(\/?)div\b[^>]*>/gi };

  /** The element holding the items: where its content starts and ends. Counts nested tags of the same name. */
  function containers(html) {
    const found = [];
    const open = /<(nav|ul|ol|div)\b[^>]*\sdata-edv-menu(?=[\s=>])[^>]*>/gi;
    let m;
    while ((m = open.exec(html))) {
      const name = m[1].toLowerCase();
      const tags = TAGS[name];
      tags.lastIndex = open.lastIndex;
      let depth = 1; let t; let end = -1;
      while ((t = tags.exec(html))) {
        depth += t[1] ? -1 : 1;
        if (!depth) { end = t.index; break; }
      }
      if (end < 0) continue;
      const max = Number((/\sdata-edv-menu-max="(\d+)"/i.exec(m[0]) || [])[1]) || 8;
      found.push({ innerStart: open.lastIndex, innerEnd: end, max });
    }
    return found;
  }

  const ITEM = /<li\b[\s\S]*?<\/li>|<a\b[\s\S]*?<\/a>/gi;

  /** Removes the attributes that mark a hand-made item (with or without a value). */
  function dropMarkers(text) {
    return text.replace(/\s(?:data-edv-nav|data-i18n|data-edv-label|data-edv-count|data-edv-keep)="[^"]*"/gi, '').replace(/\s(?:data-edv-nav|data-i18n|data-edv-label|data-edv-count|data-edv-keep)(?=[\s>])/gi, '');
  }

  /** One finished item made from the pattern. `index` is its place in the whole menu (0, 1, 2...). */
  function make(pattern, item, index) {
    let p = pattern;
    // text
    const labelled = /<(\w+)\b[^>]*\sdata-edv-label\b[^>]*>[\s\S]*?<\/\1>/i.test(p);
    if (labelled) p = p.replace(/(<(\w+)\b[^>]*\sdata-edv-label\b[^>]*>)[\s\S]*?(<\/\2>)/i, (all, o, n, c) => o + esc(item.label) + c);
    else p = p.replace(/(<a\b[^>]*>)[\s\S]*?(<\/a>)/i, (all, o, c) => o + esc(item.label) + c);
    // running number and index
    p = p.replace(/(<(\w+)\b[^>]*\sdata-edv-count\b[^>]*>)[\s\S]*?(<\/\2>)/i, (all, o, n, c) => o + String(index + 1).padStart(2, '0') + c);
    p = p.replace(/--i:\s*\d+/g, '--i:' + index);
    // address; the markers of a hand-made item go (an edit of item N must not land on a generated one)
    p = p.replace(/<a\b[^>]*>/i, (tag) => {
      const bare = dropMarkers(tag).replace(/\shref="[^"]*"/i, '');
      return bare.replace(/<a\b/i, '<a href="#' + item.anchor + '" data-edv-auto');
    });
    return dropMarkers(p);
  }

  /**
   * Writes the items into every `data-edv-menu` list of a header. With two lists the items are shared out in order
   * (the first list gets the larger half). Items beyond what fits are returned in `overflow`.
   */
  function fill(html, list) {
    const src = String(html);
    const boxes = containers(src);
    if (!boxes.length) return { html: src, overflow: [] };
    const all = Array.isArray(list) ? list : [];
    const room = boxes.reduce((n, b) => n + b.max, 0);
    const shown = all.slice(0, room);
    const overflow = all.slice(room).map(i => i.label);
    // how many items each list takes: an even share, but never more than it holds
    let left = shown.length;
    const take = boxes.map((b, i) => {
      const n = Math.min(b.max, Math.ceil(left / (boxes.length - i)));
      left -= n; return n;
    });
    let at = 0;
    const slices = take.map(n => { const part = shown.slice(at, at + n); at += n; return part; });
    let out = src;
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      const inner = src.slice(b.innerStart, b.innerEnd);
      const found = []; let m; ITEM.lastIndex = 0;
      while ((m = ITEM.exec(inner))) found.push({ text: m[0], index: m.index, keep: /\sdata-edv-keep\b/i.test(m[0].slice(0, m[0].indexOf('>') + 1)) });
      const hand = found.filter(f => !f.keep);
      if (!hand.length) continue; // no pattern in this header: leave it alone
      const base = take.slice(0, i).reduce((n, v) => n + v, 0);
      const made = slices[i].map((item, k) => make(hand[0].text, item, base + k)).join('');
      // the generated items take the place of the first hand-made one; the other hand-made items go; kept items stay
      let rebuilt = ''; let cursor = 0; let placed = false;
      found.forEach(f => {
        rebuilt += inner.slice(cursor, f.index); cursor = f.index + f.text.length;
        if (f.keep) { rebuilt += f.text; return; }
        if (!placed) { rebuilt += made; placed = true; }
      });
      rebuilt += inner.slice(cursor);
      out = out.slice(0, b.innerStart) + rebuilt + out.slice(b.innerEnd);
    }
    return { html: out, overflow };
  }

  return { items, fill, KIND_LABEL, LABEL_MAX };
});
