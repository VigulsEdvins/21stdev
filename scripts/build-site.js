#!/usr/bin/env node
/**
 * Stages what Cloudflare publishes into dist/ (git ignores it): the public site (site/) and the page builder under /builder/.
 * The builder stays where it is in the repository (tests and tools read it there); this copies exactly the files it asks for.
 *   node scripts/build-site.js           write dist/
 * The builder's own page (builder.html) becomes dist/builder/index.html. The scripts and styles it lists are copied at the same relative
 * paths, so nothing in the builder needs to know it moved. Plus the folders it reads at run time: features/ and thumbs/ next to it, and
 * assets/library/ at the top of the site (the components' own files point there with an absolute path).
 * Four small changes are made to the copy of the page: links to the old catalogue page go to the home page, the link to itself becomes
 * "./", a contact-url tag tells the guided bar where "Ask edvlabs to do it" goes, and an access-gate tag turns on the free-blocks lock.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const RUN_TIME_DIRS = ['thumbs', 'features']; // under /builder/, next to the page that reads them
const ROOT_DIRS = ['assets/library']; // the components name their pictures and fonts as /assets/library/<file>, so these sit at the top of the site
const SKIP_IN_FEATURES = /\.(tsx|ts)$/; // React sources are for the vault; the builder reads index.html, style.css, script.js

function copyFile(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function walk(dir, visit, rel = '') {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue; // .gitignore, .graphifyignore and the like are not published
    const full = path.join(dir, name), r = rel ? rel + '/' + name : name;
    if (fs.statSync(full).isDirectory()) walk(full, visit, r); else visit(full, r);
  }
}

/** The local scripts and stylesheets a page names, as relative paths. */
function localAssets(html) {
  const out = new Set();
  for (const m of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(u)) continue;
    const p = u.split(/[?#]/)[0];
    if (/\.(?:js|css)$/.test(p)) out.add(p);
  }
  return [...out];
}

/** The local files a stylesheet pulls in with @import and url(...), as repository-relative paths (data: and remote addresses are skipped). */
function cssDeps(css, rel) {
  const out = [];
  for (const m of css.matchAll(/(?:@import\s+(?:url\()?|url\()\s*["']?([^"')\s]+)["']?\s*\)?/g)) {
    const u = m[1];
    if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(u)) continue;
    out.push(path.posix.normalize(path.posix.join(path.posix.dirname(rel), u.split(/[?#]/)[0])));
  }
  return out;
}

/** The copy of builder.html that is published. */
function stageBuilderPage(html) {
  let out = html
    .replace(/href="builder\.html"/g, 'href="./"')
    .replace(/href="index\.html(?:\?[^"]*)?"/g, 'href="../"');
  if (!/<meta name="contact-url"/.test(out)) out = out.replace('</head>', '  <meta name="contact-url" content="../contact/" />\n</head>');
  if (!/<meta name="access-gate"/.test(out)) out = out.replace('</head>', '  <meta name="access-gate" content="on" />\n</head>'); // turns on the free-blocks lock (scripts/builder/access.js)
  return out;
}

function buildSite({ out = path.join(ROOT, 'dist'), log = () => {} } = {}) {
  fs.rmSync(out, { recursive: true, force: true });
  let n = 0;
  walk(path.join(ROOT, 'site'), (from, rel) => { copyFile(from, path.join(out, rel)); n++; });

  const B = path.join(out, 'builder');
  const page = fs.readFileSync(path.join(ROOT, 'builder.html'), 'utf8');
  fs.mkdirSync(B, { recursive: true });
  fs.writeFileSync(path.join(B, 'index.html'), stageBuilderPage(page)); n++;
  for (const rel of localAssets(page)) {
    const from = path.join(ROOT, rel);
    if (!fs.existsSync(from)) throw new Error('builder.html names ' + rel + ' but the file does not exist');
    copyFile(from, path.join(B, rel)); n++;
    if (rel.endsWith('.css')) { // a stylesheet can pull in more files (tokens, fonts); follow them, however deep
      const queue = cssDeps(fs.readFileSync(from, 'utf8'), rel);
      for (let dep; (dep = queue.shift());) {
        const src = path.join(ROOT, dep), dst = path.join(B, dep);
        if (!fs.existsSync(src)) throw new Error(rel + ' refers to ' + dep + ' but the file does not exist');
        if (fs.existsSync(dst)) continue;
        copyFile(src, dst); n++;
        if (dep.endsWith('.css')) queue.push(...cssDeps(fs.readFileSync(src, 'utf8'), dep));
      }
    }
  }
  for (const dir of RUN_TIME_DIRS) {
    walk(path.join(ROOT, dir), (from, rel) => {
      if (dir === 'features' && SKIP_IN_FEATURES.test(rel)) return;
      copyFile(from, path.join(B, dir, rel)); n++;
    });
  }
  for (const dir of ROOT_DIRS) walk(path.join(ROOT, dir), (from, rel) => { copyFile(from, path.join(out, dir, rel)); n++; });
  log('dist/ written: ' + n + ' files (public site + /builder/)');
  return { out, files: n };
}

if (require.main === module) {
  try { buildSite({ log: console.log }); } catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { buildSite, localAssets, cssDeps, stageBuilderPage };
