/**
 * Single-file export of a multi-page site: every page's sections go into one HTML file and a small router shows the
 * page named in the address (#about-us, no hash = the home page), with its own title. Links between pages become
 * "#<page>" links.
 *   BuilderSinglePages.pageKeys(pages) -> { [pageId]: key }     (the link target of each page)
 *   BuilderSinglePages.addRouter(html, pages) -> html           (pages: [{ key, title, ids: [sectionId] }])
 */
(function () {
  'use strict';

  /** URL-safe, unique key per page; the first page is "home". */
  function pageKeys(pages) {
    const out = {};
    const used = new Set();
    pages.forEach((p, i) => {
      let key = i === 0 ? 'home' : String(p.slug || p.title || 'page').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
      while (used.has(key)) key += '-' + (i + 1);
      used.add(key);
      out[p.id] = key;
    });
    return out;
  }

  const safe = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

  function addRouter(html, pages) {
    const script = `<script id="page-router">
(function () {
  var pages = ${safe(pages)};
  function show() {
    var key = decodeURIComponent((location.hash || '').slice(1));
    var current = pages.filter(function (p) { return p.key === key; })[0] || pages[0];
    pages.forEach(function (p) {
      p.ids.forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = p === current ? '' : 'none'; });
    });
    document.title = current.title;
    if (document.documentElement.dataset.page !== current.key) {
      document.documentElement.dataset.page = current.key;
      window.scrollTo(0, 0);
      // sections that sized themselves while hidden measure again
      requestAnimationFrame(function () { window.dispatchEvent(new Event('resize')); });
    }
  }
  window.addEventListener('hashchange', show);
  show();
})();
</script>`;
    return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${script}\n</body>`) : html + script;
  }

  /**
   * hreflang alternates for translated pages: { [pageId]: [{ lang, href }] }. Needs the live address (canonical) of the
   * site, because hreflang links must be full addresses; without it, or for a group whose pages share a language, nothing is returned.
   */
  function translationAlternates(pages, site = {}) {
    const canonical = String(site.canonical || '').trim();
    if (!/^https?:\/\/[^\s"'<>]+$/i.test(canonical)) return {};
    const base = canonical.endsWith('/') ? canonical : canonical.replace(/[^/]*$/, '');
    const hrefOf = (p, i) => (i === 0 ? base : `${base}${p.slug}.html`);
    const langOf = (p) => p.lang || site.lang || 'en';
    const groups = {};
    pages.forEach((p, i) => { const root = p.translationOf || p.id; (groups[root] = groups[root] || []).push({ p, i }); });
    const out = {};
    Object.entries(groups).forEach(([root, members]) => {
      if (members.length < 2 || new Set(members.map(x => langOf(x.p))).size !== members.length) return;
      const list = members.map(({ p, i }) => ({ lang: langOf(p), href: hrefOf(p, i) }));
      const original = members.find(x => x.p.id === root);
      if (original) list.push({ lang: 'x-default', href: hrefOf(original.p, original.i) });
      members.forEach(({ p }) => { out[p.id] = list; });
    });
    return out;
  }

  const api = { pageKeys, addRouter, translationAlternates };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderSinglePages = api;
})();
