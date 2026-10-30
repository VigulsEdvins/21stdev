/**
 * Pages, links, menu and anchors for the assembler, plus the content overrides collected from the sections.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 * The code between the braces is not indented, so the template strings in it stay byte for byte as they were.
 */
(function () {
/**
 * Links to other pages of a multi-page site are stored as "page:<id>". `links` maps a page id to its file name
 * ("about.html"); without a match (the preview, or a deleted page) the link becomes "#".
 */
function resolvePageLink(value, links = {}) {
  const m = /^page:([A-Za-z0-9_-]+)$/.exec(String(value || '').trim());
  return m ? (links[m[1]] || '#') : value;
}

/** A copy of the sections with every "page:<id>" link (Content-tab links and widget buttons) resolved. */
function mapPageLinks(sections, links = {}) {
  const LINK_KEYS = ['link', 'ctaLink'];
  return (Array.isArray(sections) ? sections : []).map(sec => {
    let changed = false;
    const out = { ...sec };
    if (sec.overrides) {
      out.overrides = {};
      Object.entries(sec.overrides).forEach(([k, o]) => {
        if (o && o.type === 'link' && /^page:/.test(String(o.value || ''))) { out.overrides[k] = { ...o, value: resolvePageLink(o.value, links) }; changed = true; }
        else out.overrides[k] = o;
      });
    }
    if (Array.isArray(sec.elements)) {
      out.elements = sec.elements.map(el => {
        const fix = {};
        LINK_KEYS.forEach(k => { if (typeof el[k] === 'string' && /^page:/.test(el[k])) { fix[k] = resolvePageLink(el[k], links); changed = true; } });
        return Object.keys(fix).length ? { ...el, ...fix } : el;
      });
    }
    return changed ? out : sec;
  });
}

/** How a section's title and category are found when the stack item does not carry them (the builder's registry, or the loaded feature files). */
function sectionLookups(featuresData) {
  const registry = typeof window !== 'undefined' && Array.isArray(window.FEATURE_REGISTRY) ? window.FEATURE_REGISTRY : [];
  const bySlug = {};
  registry.forEach(f => { bySlug[f.slug] = f; });
  return {
    titleOf: s => s.title || (featuresData[s.slug] && (featuresData[s.slug].title || featuresData[s.slug].name)) || (bySlug[s.slug] && bySlug[s.slug].title) || s.slug,
    categoryOf: s => (featuresData[s.slug] && featuresData[s.slug].category) || (bySlug[s.slug] && bySlug[s.slug].category) || ''
  };
}

/** Anchor names for the sections (scripts/builder/anchors.js); {} when that file is not loaded. */
function anchorNames(sections, featuresData, reserved) {
  const A = (typeof module !== 'undefined' && module.exports) ? require('../builder/anchors.js') : (typeof window !== 'undefined' ? window.BuilderAnchors : null);
  if (!A) return {};
  return A.assign(sections, Object.assign({ reserved }, sectionLookups(featuresData)));
}

/** The items an automatic menu lists (scripts/builder/menu.js): [{ id, label, anchor }]; [] when that file is not loaded. */
function menuItems(sections, names, featuresData) {
  const M = (typeof module !== 'undefined' && module.exports) ? require('../builder/menu.js') : (typeof window !== 'undefined' ? window.BuilderMenu : null);
  return M ? M.items(sections, names, sectionLookups(featuresData || {})) : [];
}

/** The invisible target that "#name" scrolls to: just before its section, which keeps its own id. */
function anchorSpan(name, sectionId) {
  return name ? `  <span class="edv-anchor" id="${name}" data-for="${sectionId}"></span>\n` : '';
}

/** Keeps a sticky header from covering the title of the section a menu link scrolls to. */
const ANCHOR_CSS = '.edv-anchor{display:block;height:0;scroll-margin-top:80px}';

/** Fills in the menu items that go nowhere with the section their text names (scripts/builder/anchors.js); a function that changes nothing without anchors. */
function navLinker(anchors, options, menuList) {
  const A = (typeof module !== 'undefined' && module.exports) ? require('../builder/anchors.js') : (typeof window !== 'undefined' ? window.BuilderAnchors : null);
  const M = (typeof module !== 'undefined' && module.exports) ? require('../builder/menu.js') : (typeof window !== 'undefined' ? window.BuilderMenu : null);
  const names = Object.values(anchors || {});
  if (!A || !names.length) return (html) => html;
  const o = options || {};
  return (html, section) => {
    let note = '';
    // a header set to list the page's sections writes its items first; they are links already, so the steps below leave them alone
    if (M && section && section.menuMode === 'auto' && /\sdata-edv-menu\b/.test(html)) {
      const r = M.fill(html, menuList || []);
      html = r.html;
      if (r.overflow.length) note = '\n' + A.overflowNote(r.overflow);
    }
    const linked = A.linkNav(html, names);
    if (o.keepUnlinkedNav) return linked + note;
    // an export leaves out the menu items that still go nowhere (counting the addresses set in the admin panel); a note tells the page checks
    const r = A.hideUnlinked(linked, A.linkedItems(section && section.overrides));
    return (r.hidden.length ? r.html + '\n' + A.hiddenNote(r.hidden) : r.html) + note;
  };
}

/**
 * Client-content overrides: sections carry { fieldId: { selector, type, value, attr? } }.
 * Returns a flat list the runtime below applies inside each section.
 */
function collectOverrides(sections) {
  const out = [];
  // javascript:, vbscript: and non-image data: addresses never reach a link or an image, whoever typed them
  // (an imported project is cleaned the same way by scripts/project-sanitize.js)
  const safeUrl = (v) => {
    const probe = v.replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
    return /^(javascript|vbscript):/.test(probe) || (/^data:/.test(probe) && !/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);/.test(probe)) ? '#' : v;
  };
  (Array.isArray(sections) ? sections : []).forEach(sec => {
    Object.entries(sec.overrides || {}).forEach(([fieldId, o]) => {
      if (o && typeof o === 'object' && o.selector && o.value !== undefined && o.value !== '') {
        const type = o.type || 'text';
        const value = type === 'link' || type === 'image' ? safeUrl(String(o.value)) : String(o.value);
        out.push({ section: sec.id, field: fieldId, selector: o.selector, type, attr: o.attr || '', value });
      }
    });
  });
  return out;
}

const api = { resolvePageLink, mapPageLinks, anchorNames, menuItems, anchorSpan, ANCHOR_CSS, navLinker, collectOverrides };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.AsmPages = api;
})();
