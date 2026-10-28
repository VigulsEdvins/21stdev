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
const SLUGS = ['cargo-freight-landing', 'cobalt-toile-landing', 'blossom-dusk-template', 'ridgeline-trek-landing', 'bento-portfolio-template', 'iris-folio-template'];
const BAR = '<div class="edv-sample-bar" role="region" aria-label="About this sample page"><span>A sample page made with edvlabs</span><a href="../../">Back to edvlabs</a><a href="../../start/" class="edv-sample-bar__go">Start your page</a></div>';

function wrap(html) {
  if (!/<\/head>/i.test(html) || !/<\/body>/i.test(html)) throw new Error('page has no head or body to add to');
  let out = html;
  if (!/<meta[^>]+name=["']robots["']/i.test(out)) out = out.replace(/<\/head>/i, '  <meta name="robots" content="noindex">\n</head>');
  out = out.replace(/<\/head>/i, '  <link rel="stylesheet" href="../bar.css">\n</head>');
  return out.replace(/<\/body>/i, BAR + '\n</body>');
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

if (require.main === module) {
  const want = files();
  if (process.argv.includes('--check')) {
    const bad = Object.entries(want).filter(([f, text]) => !fs.existsSync(path.join(OUT, f)) || fs.readFileSync(path.join(OUT, f), 'utf8') !== text).map(([f]) => f);
    if (bad.length) { console.error('Out of date, run node scripts/build-examples.js:\n  ' + bad.join('\n  ')); process.exit(1); }
    console.log(`✓ ${Object.keys(want).length} example files match features/`);
  } else {
    for (const [f, text] of Object.entries(want)) { fs.mkdirSync(path.dirname(path.join(OUT, f)), { recursive: true }); fs.writeFileSync(path.join(OUT, f), text); }
    console.log(`wrote ${Object.keys(want).length} files to site/examples/`);
  }
}
module.exports = { SLUGS, files, wrap };
