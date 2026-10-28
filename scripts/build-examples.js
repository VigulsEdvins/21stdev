#!/usr/bin/env node
/**
 * Publishes the sample pages shown on the home page as full pages under site/examples/<slug>/.
 * Each is a copy of a page from features/ (index.html, style.css, script.js) with three additions to the HTML: a noindex tag,
 * a link to the shared bar stylesheet, and a small "sample page" bar with a way back and a way to start. Nothing else changes,
 * so the pages stay inside the strict Content Security Policy of site/_headers (no inline code, no other hosts).
 *   node scripts/build-examples.js            write the copies
 *   node scripts/build-examples.js --check    fail if a committed copy differs from what the build would write
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'site', 'examples');
// Whole websites. They live in folders next to this repo (plan E0.6); the published name is the key.
const SITES = { yearbook: 'edv-yearbook', arena: 'edv-arena', roster: 'edv-roster' };
const SLUGS = ['cargo-freight-landing', 'cobalt-toile-landing', 'blossom-dusk-template', 'ridgeline-trek-landing', 'bento-portfolio-template', 'iris-folio-template'];
const BAR = '<div class="edv-sample-bar" role="region" aria-label="About this sample page"><span>A sample page made with edvlabs</span><a href="../../">Back to edvlabs</a><a href="../../start/" class="edv-sample-bar__go">Start your page</a></div>';

function wrap(html) {
  if (!/<\/head>/i.test(html) || !/<\/body>/i.test(html)) throw new Error('page has no head or body to add to');
  let out = html;
  if (!/<meta[^>]+name=["']robots["']/i.test(out)) out = out.replace(/<\/head>/i, '  <meta name="robots" content="noindex">\n</head>');
  out = out.replace(/<\/head>/i, '  <link rel="stylesheet" href="../bar.css">\n</head>');
  return out.replace(/<\/body>/i, BAR + '\n</body>');
}

/** Brings a whole-website page under the strict policy. Only the listed fixes are allowed; anything else inline stops the build. */
const STYLE_FIXES = { 'margin-top: 3rem;': { cls: 'edv-mt-3' }, 'margin-top: 1rem;': { cls: 'edv-mt-1' }, 'fill:currentColor': { attr: 'fill="currentColor"' } };
const FRAME_BUSTER = /<script>\s*if \(window\.self !== window\.top\) \{\s*window\.top\.location = window\.self\.location;\s*\}\s*<\/script>\s*/;
function fixPolicy(html, label) {
  let out = html;
  let needsFixesJs = false;
  out = out.replace(/<link\b[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>\s*/gi, ''); // no Google font requests; the page falls back to its own font stack
  out = out.replace(FRAME_BUSTER, ''); // the response header frame-ancestors already forbids framing
  out = out.replace(/\sonsubmit="return false;"/g, () => { needsFixesJs = true; return ' data-no-submit'; });
  out = out.replace(/<([a-zA-Z][\w-]*)([^<>]*?)\sstyle="([^"]*)"([^<>]*)>/g, (all, tag, before, style, after) => {
    const fix = STYLE_FIXES[style.trim()];
    if (!fix) throw new Error(label + ': an inline style the build does not know how to replace: ' + style);
    let attrs = before + after;
    if (fix.attr) return '<' + tag + attrs + ' ' + fix.attr + '>';
    if (/\sclass="/.test(attrs)) attrs = attrs.replace(/\sclass="([^"]*)"/, (m, c) => ' class="' + c + ' ' + fix.cls + '"');
    else attrs += ' class="' + fix.cls + '"';
    return '<' + tag + attrs + '>';
  });
  if (/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(ld\+)?json")[^>]*>/i.test(out)) throw new Error(label + ': an inline script is left');
  if (/\son[a-z]+\s*=\s*["']/i.test(out)) throw new Error(label + ': an inline event handler is left');
  if (/\sstyle\s*=/.test(out)) throw new Error(label + ': an inline style is left');
  if (/https?:\/\/fonts\.(googleapis|gstatic)\.com/.test(out)) throw new Error(label + ': a Google font request is left');
  if (needsFixesJs) out = out.replace(/<\/body>/i, '<script src="../fixes.js"></script>\n</body>');
  return out;
}

/**
 * The three sites now share one web address, so their browser-storage and sync-channel names must not collide (arena and roster
 * both used edv_site_data_v1 and friends, so an edit in one would have shown in the other). Each name gets the sample's own prefix.
 */
const SHARED_NAMES = /(['"])edv_((?:site_data|site_draft|custom_uploads|admin_mode|media_db|cms_sync_channel)[A-Za-z0-9_]*)\1/g;
function namespaceStorage(js, name) { return js.replace(SHARED_NAMES, (m, q, rest) => q + 'edv_' + name + '_' + rest + q); }

function siteFiles() {
  const out = {};
  for (const [name, dirName] of Object.entries(SITES)) {
    const dir = path.join(ROOT, '..', dirName);
    if (!fs.existsSync(dir)) continue; // the sources are not in every checkout
    const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(p, r); else out[`${name}/${r}`] = p; } };
    walk(dir, '');
  }
  return out;
}

function files() {
  const out = {};
  for (const slug of SLUGS) {
    const dir = path.join(ROOT, 'features', slug);
    out[`${slug}/index.html`] = wrap(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'));
    for (const f of ['style.css', 'script.js']) out[`${slug}/${f}`] = fs.readFileSync(path.join(dir, f), 'utf8');
  }
  return out;
}

/** The whole websites as { published path: Buffer }. Pages get the policy fixes and a noindex tag; the front page also gets the bar. */
function siteBuffers() {
  const out = {};
  for (const [file, src] of Object.entries(siteFiles())) {
    if (/\.html$/.test(file)) {
      let html = fixPolicy(fs.readFileSync(src, 'utf8'), file);
      if (!/<meta[^>]+name=["']robots["']/i.test(html)) html = html.replace(/<\/head>/i, '  <meta name="robots" content="noindex">\n</head>');
      html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="../bar.css">\n</head>');
      if (/\/index\.html$/.test(file)) html = html.replace(/<\/body>/i, BAR + '\n</body>');
      out[file] = Buffer.from(html);
    } else if (/\.js$/.test(file) && !/\/assets\/vendor\//.test(file)) out[file] = Buffer.from(namespaceStorage(fs.readFileSync(src, 'utf8'), file.split('/')[0]));
    else out[file] = fs.readFileSync(src);
  }
  return out;
}

if (require.main === module) {
  const want = Object.assign({}, Object.fromEntries(Object.entries(files()).map(([f, t]) => [f, Buffer.from(t)])), siteBuffers());
  const haveSites = Object.keys(SITES).every((n) => Object.keys(want).some((f) => f.startsWith(n + '/')));
  if (process.argv.includes('--check')) {
    const bad = Object.entries(want).filter(([f, buf]) => !fs.existsSync(path.join(OUT, f)) || !fs.readFileSync(path.join(OUT, f)).equals(buf)).map(([f]) => f);
    if (bad.length) { console.error('Out of date, run node scripts/build-examples.js:\n  ' + bad.slice(0, 20).join('\n  ')); process.exit(1); }
    // without the sibling folders the whole websites cannot be rebuilt here, but the published copies must still be there
    const missing = haveSites ? [] : Object.keys(SITES).filter((n) => !fs.existsSync(path.join(OUT, n, 'index.html')));
    if (missing.length) { console.error('Published whole websites missing: ' + missing.join(', ')); process.exit(1); }
    console.log(`✓ ${Object.keys(want).length} example files match their sources${haveSites ? '' : ' (the whole websites were only checked for presence: their folders are not next to this repo)'}`);
  } else {
    for (const [f, buf] of Object.entries(want)) { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), buf); }
    console.log(`wrote ${Object.keys(want).length} files to site/examples/`);
  }
}
module.exports = { SLUGS, SITES, files, wrap, fixPolicy, namespaceStorage };
