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

  /** Pages grouped by translation: { [pageId]: [{ id, lang, index, slug }] } for every page in a group of two or more with distinct languages. */
  function translationGroups(pages, siteLang) {
    const langOf = (p) => p.lang || siteLang || 'en';
    const groups = {};
    pages.forEach((p, i) => { const root = p.translationOf || p.id; (groups[root] = groups[root] || []).push({ id: p.id, lang: langOf(p), index: i, slug: p.slug }); });
    const out = {};
    Object.values(groups).forEach(members => {
      if (members.length < 2 || new Set(members.map(m => m.lang)).size !== members.length) return;
      members.forEach(m => { out[m.id] = members; });
    });
    return out;
  }

  /**
   * hreflang alternates for translated pages: { [pageId]: [{ lang, href }] }. Needs the live address (canonical) of the
   * site, because hreflang links must be full addresses; without it, or for a group whose pages share a language, nothing is returned.
   */
  function translationAlternates(pages, site = {}) {
    const canonical = String(site.canonical || '').trim();
    if (!/^https?:\/\/[^\s"'<>]+$/i.test(canonical)) return {};
    const base = canonical.endsWith('/') ? canonical : canonical.replace(/[^/]*$/, '');
    const hrefOf = (m) => (m.index === 0 ? base : `${base}${m.slug}.html`);
    const groups = translationGroups(pages, site.lang);
    const out = {};
    Object.entries(groups).forEach(([pageId, members]) => {
      const list = members.map(m => ({ lang: m.lang, href: hrefOf(m) }));
      const root = (pages.find(p => p.id === pageId) || {}).translationOf || pageId;
      const original = members.find(m => m.id === root);
      if (original) list.push({ lang: 'x-default', href: hrefOf(original) });
      out[pageId] = list;
    });
    return out;
  }

  const NAMES = { en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano', pt: 'Português', nl: 'Nederlands', pl: 'Polski', lv: 'Latviešu', lt: 'Lietuvių', et: 'Eesti', ru: 'Русский', uk: 'Українська', sv: 'Svenska', no: 'Norsk', nb: 'Norsk', da: 'Dansk', fi: 'Suomi', cs: 'Čeština', sk: 'Slovenčina', hu: 'Magyar', ro: 'Română', bg: 'Български', el: 'Ελληνικά', tr: 'Türkçe', ja: '日本語', zh: '中文', ko: '한국어', ar: 'العربية', he: 'עברית', hi: 'हिन्दी' };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /**
   * Makes the language switcher header of a page list the page's translations and open them: its menu gets one option per
   * language of the group (current one selected), each carrying the file to open. Returns { html, js } where `js` is the
   * small script that follows the links (the page's own script file gets it appended), or null when the page has no
   * switcher or no translations.
   *   members: [{ id, lang, index, slug }], fileOf(member) -> 'about.html'
   */
  function wireLanguageSwitcher(html, members, currentId, fileOf) {
    if (!Array.isArray(members) || members.length < 2 || !/class="lsw-menu"/.test(html)) return null;
    const label = (lang) => NAMES[lang] || NAMES[String(lang).split('-')[0]] || String(lang).toUpperCase();
    const items = members.map(m => `<li role="option" tabindex="-1" data-lang="${esc(m.lang)}" data-href="${esc(fileOf(m))}" aria-selected="${m.id === currentId}">${esc(label(m.lang))}</li>`).join('\n          ');
    const current = members.find(m => m.id === currentId);
    let out = html.replace(/(<ul class="lsw-menu"[^>]*>)[\s\S]*?(<\/ul>)/, (m, open, close) => `${open}\n          ${items}\n        ${close}`);
    if (current) out = out.replace(/(<span class="lsw-code">)[^<]*(<\/span>)/, `$1${esc(String(current.lang).split('-')[0].toUpperCase())}$2`);
    const js = `\n;(function () { document.querySelectorAll('.lsw-menu [data-href]').forEach(function (o) { o.addEventListener('click', function () { window.location.href = o.getAttribute('data-href'); }); }); })();\n`;
    return { html: out, js };
  }

  const api = { pageKeys, addRouter, translationGroups, translationAlternates, wireLanguageSwitcher };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderSinglePages = api;
})();
