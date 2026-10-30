#!/usr/bin/env node
/**
 * Golden snapshot of scripts/assembler.js (plan: docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Runs the assembler on real feature files for every theme and option set the builder uses, hashes each result
 * and compares it with tests/data/assembler-golden.json. A refactor of the assembler must change nothing here.
 *   node tests/snapshot-assembler.js            compare with the golden file (exit 1 on any difference)
 *   node tests/snapshot-assembler.js --write    rewrite the golden file from the current code
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const GOLDEN = path.join(__dirname, 'data', 'assembler-golden.json');

// the assembler stamps dates and random ids in a few places: freeze them so two runs give the same bytes
const RealDate = Date;
const FIXED = new RealDate('2026-01-02T03:04:05.000Z').getTime();
global.Date = class extends RealDate {
  constructor(...a) { super(...(a.length ? a : [FIXED])); }
  static now() { return FIXED; }
};
Math.random = () => 0.5;

const A = require('../scripts/assembler.js');

const hash = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const results = {};
function record(name, fn) {
  let out;
  try { out = fn(); } catch (e) { out = 'THROWS: ' + e.message; if (process.env.SNAP_VERBOSE) console.log('throws', name, e.message); }
  if (out instanceof Uint8Array) out = Buffer.from(out).toString('base64');
  results[name] = hash(out === undefined ? 'undefined' : out);
}

// ---- real sections: one per kind of block, read from features/
const SLUGS = ['a4-resume-previewer', 'beam-wordmark-footer', 'client-logo-marquee', 'custom-magnetic-cursor', 'feature-grid-icons',
  'glass-headline-hero', 'ink-flow-carousel', 'lilac-dusk-canopy', 'multi-step-form', 'phosphor-crt-404', 'rgb-glitch-carousel',
  'spotlight-bento-grid', 'type-remix-preloader', 'sticky-shrink-header', 'mega-menu-header', 'pricing-table-switch', 'faq-accordion-smooth'];
function read(slug, f) { try { return fs.readFileSync(path.join(ROOT, 'features', slug, f), 'utf8'); } catch (e) { return ''; } }
const sections = SLUGS.filter(s => fs.existsSync(path.join(ROOT, 'features', s))).map((slug, i) => ({
  id: 's' + i, slug, title: slug, html: read(slug, 'index.html'), css: read(slug, 'style.css'), js: read(slug, 'script.js')
}));
if (sections.length < 12) { console.error('snapshot: expected at least 12 real features, found ' + sections.length); process.exit(2); }
const featuresData = Object.fromEntries(sections.map(s => [s.slug, { slug: s.slug, name: s.slug }]));

const variants = {
  plain: s => s,
  first4: s => s.slice(0, 4),
  one: s => s.slice(0, 1),
  empty: () => [],
  hidden: s => s.map((x, i) => (i === 1 ? Object.assign({}, x, { hidden: true }) : x)),
  sticky: s => s.map((x, i) => (i === 0 ? Object.assign({}, x, { sticky: true }) : x)),
  sized: s => s.map((x, i) => (i % 3 === 0 ? Object.assign({}, x, { sizing: { padding: 'large', minHeight: 520, fit: 'cover' } }) : x)),
  dark: s => s.map((x, i) => (i === 2 ? Object.assign({}, x, { themeMode: 'dark' }) : x)),
  light: s => s.map((x, i) => (i === 2 ? Object.assign({}, x, { themeMode: 'light' }) : x))
};
const optionSets = {
  none: {},
  page: { page: { title: 'Snap & Co', description: 'A <test> page', lang: 'en', url: 'https://example.com/' } },
  anchors: { anchors: { reserved: ['about'] }, page: { title: 'Anchors' } },
  navPreview: { navPreview: true },
  review: { review: true, page: { title: 'Review' } },
  csp: { csp: true, page: { title: 'Csp', url: 'https://example.com/' } },
  quiet: { suppressPreloader: true, ownPalette: true }
};

// applyThemeToDocument works on a live DOM: a tiny stand-in that records every write it makes
function fakeThemeRun(theme) {
  const log = [];
  const el = (tag) => ({
    tag, style: { setProperty: (k, v) => log.push(['var', k, v]) }, dataset: {}, children: [],
    setAttribute: (k, v) => log.push([tag, k, v]), insertBefore(n) { log.push(['insert', n.tag]); },
    classList: { add() {}, remove() {}, toggle() {} }, set textContent(v) { log.push(['css', v]); }
  });
  const head = el('head'), body = el('body');
  const sec = Object.assign(el('section'), { id: 's', getAttribute: () => null, hasAttribute: () => false, querySelectorAll: () => [] });
  const doc = {
    head, body, documentElement: el('html'), getElementById: () => null, createElement: el,
    querySelectorAll: (q) => (q.includes('page-section') ? [sec] : []), defaultView: null
  };
  A.applyThemeToDocument(doc, theme);
  return log;
}

const presets = Object.keys(A.THEME_PRESETS);
for (const preset of presets) {
  const theme = A.THEME_PRESETS[preset];
  record('resolveTheme/' + preset, () => A.resolveTheme(theme));
  record('universalCss/' + preset, () => A.generateUniversalThemeStyles(A.resolveTheme(theme)));
  record('isDarkTheme/' + preset, () => A.isDarkTheme(theme));
  for (const [vn, vf] of Object.entries(variants)) {
    const st = vf(sections);
    record(`preview/${preset}/${vn}`, () => A.assemblePreviewDocument(st, theme, featuresData, {}));
    if (preset === presets[0] || vn === 'plain') {
      for (const [on, opts] of Object.entries(optionSets)) {
        record(`preview/${preset}/${vn}/${on}`, () => A.assemblePreviewDocument(st, theme, featuresData, opts));
        record(`export/${preset}/${vn}/${on}`, () => A.generateExportBundle(st, theme, featuresData, opts));
        record(`single/${preset}/${vn}/${on}`, () => A.generateSingleFileBundle(st, theme, featuresData, opts));
      }
    } else {
      record(`export/${preset}/${vn}`, () => A.generateExportBundle(st, theme, featuresData, {}));
    }
  }
  record('applyTheme/' + preset, () => fakeThemeRun(theme));
}

// ---- smaller functions called directly
const t0 = A.THEME_PRESETS[presets[0]];
record('presets', () => A.THEME_PRESETS);
record('overlayCss', () => A.OVERLAY_ELEMENT_CSS);
record('reviewRuntime', () => A.REVIEW_RUNTIME);
record('siteExtraFiles', () => A.SITE_EXTRA_FILES);
record('overlayHtml', () => A.renderSectionOverlayHtml([{ id: 'e1', type: 'text', text: 'Hi <b>', x: 10, y: 20, w: 100, h: 40 }, { id: 'e2', type: 'image', src: 'a.png', x: 0, y: 0, w: 50, h: 50 }]));
record('sizing', () => A.computeSectionSizingStyles({ padding: 'large', minHeight: 480, fit: 'cover' }));
record('sizing/empty', () => A.computeSectionSizingStyles({}));
record('responsive', () => A.renderResponsiveCss(sections.map((s, i) => (i % 2 ? Object.assign({}, s, { responsive: { tablet: { hide: true }, mobile: { pad: 'compact' } } }) : s))));
record('scopeStyles', () => sections.map(s => A.scopeSectionStyles(s.css, s.id, false, false)));
record('scopeStyles/keep', () => sections.map(s => A.scopeSectionStyles(s.css, s.id, true, true)));
record('isolateMarkup', () => sections.map(s => A.isolateSectionMarkup(s.html, s.id)));
record('isolateScript', () => sections.map(s => A.isolateSectionScript(s.js, s.id)));
record('headLinks', () => sections.map(s => A.extractHeadLinks(s.html)));
record('previewScripts', () => A.renderPreviewSectionScripts(sections, featuresData));
record('nativePalette', () => A.renderNativePaletteCss(sections, { s0: ['light'], s1: ['dark'] }));
record('overrides', () => A.collectOverrides(sections.map((s, i) => (i === 0 ? Object.assign({}, s, { overrides: { '.a': { text: 'x' } } }) : s))));
record('pageLink', () => [A.resolvePageLink('page:about', { about: 'about.html' }), A.resolvePageLink('#x', {}), A.resolvePageLink('', {})]);
record('mapLinks', () => A.mapPageLinks([{ id: 'a', slug: 'x', html: '<a href="page:about">a</a>' }], { about: 'about.html' }));
record('anchorNames', () => A.anchorNames(sections, featuresData, ['about']));
record('menuItems', () => A.menuItems(sections, A.anchorNames(sections, featuresData, []), featuresData));
const pages = [{}, { title: 'T', description: 'D "q"', lang: 'lv', url: 'https://example.com', author: 'Me', image: 'og.png', siteName: 'S' }];
pages.forEach((p, i) => {
  record('pageHead/' + i, () => A.renderPageHead(p));
  record('pageHead/fallback/' + i, () => A.renderPageHead(p, 'Fallback', { siteFiles: true }));
  record('jsonLd/' + i, () => A.renderJsonLd(p, 'Title'));
  record('site404/' + i, () => A.render404(p));
  record('securityTxt/' + i, () => A.renderSecurityTxt(p));
  record('deployFiles/' + i, () => A.renderDeployFiles(p, {}));
  record('siteFiles/' + i, () => A.renderSiteFiles(p, null));
  record('siteFiles/pages/' + i, () => A.renderSiteFiles(p, ['index.html', 'about.html']));
});
record('csp', () => A.renderCsp('<html><body><img src="a.png"></body></html>', 'console.log(1)', {}));
record('csp/opts', () => A.renderCsp('<html><body><iframe src="https://www.youtube.com/embed/x"></iframe></body></html>', '', { forms: true }));
record('assetUrls', () => A.findLocalAssetUrls('url(/a/b.png) src="/c.webp" href="//cdn/x.png" "/d.svg"'));
record('rewriteUrls', () => A.rewriteLocalAssetUrls('url(/a/b.png) src="/c.webp" "/d.svg"', { '/a/b.png': 'assets/b.png', '/c.webp': 'assets/c.webp' }));
record('zip', () => A.createZipArchive({ 'index.html': '<h1>é</h1>', 'a/b.txt': 'hello', 'empty.txt': '' }));
record('zip/bundle', () => A.createZipArchive(A.generateExportBundle(sections.slice(0, 3), t0, featuresData, {})));

// the public face: the names the rest of the repo relies on
results['exports'] = Object.keys(A).sort().join(',');
// the browser gets a shorter list than Node (window.Assembler); load the file the way a page does and record it
{
  const vm = require('vm');
  const win = {};
  const ctx = vm.createContext({ window: win, console, TextEncoder, URL });
  ctx.window = win;
  const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  // the same order as the script tags in builder.html
  for (const f of fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8').match(/scripts\/assembler\/[\w-]+\.js/g) || []) load(f);
  load('scripts/assembler.js');
  results['exports/browser'] = Object.keys(win.Assembler).sort().join(',');
}

const sorted = Object.fromEntries(Object.keys(results).sort().map(k => [k, results[k]]));
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
  fs.writeFileSync(GOLDEN, JSON.stringify(sorted, null, 1) + '\n');
  console.log('golden file written: ' + Object.keys(sorted).length + ' entries');
  process.exit(0);
}
const golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
const bad = [];
for (const k of new Set([...Object.keys(golden), ...Object.keys(sorted)])) if (golden[k] !== sorted[k]) bad.push(k);
if (bad.length) {
  console.error('assembler output changed in ' + bad.length + ' of ' + Object.keys(golden).length + ' checks:\n  ' + bad.slice(0, 25).join('\n  '));
  process.exit(1);
}
console.log('✅ Assembler snapshot unchanged (' + Object.keys(golden).length + ' checks)');
