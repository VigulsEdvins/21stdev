#!/usr/bin/env node
/**
 * Export matrix: for every feature, builds a one-section page in the real builder, downloads the ZIP through
 * the real "Download ZIP" button, unpacks it and opens index.html over plain static hosting (a tiny server on the
 * unpacked folder, no vault server), the way a client's web host serves it. Fails on a missing file, a page error, a console error, a failed local request, a
 * broken image or an empty section. Requests to other hosts (fonts, CDNs) are reported, not failed.
 *   npm run check-exports [-- --slug a,b] [--themes dark|light|both] [--concurrency 4]
 * KNOWN_EMPTY mirrors check-blank: features that render nothing in headless Chromium (no GPU / interaction-gated).
 * KNOWN_EXTERNAL lists the features whose export still contacts another website (and which); any other feature that
 * does is a failure, so a new hot-linked image or font cannot slip in. Run scripts/localize-remote.js to fix one.
 * KNOWN_BROKEN lists exports that are known not to work, with the reason; they are reported but do not fail the run.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const THEMES = { dark: 'midnight-dark', light: 'clean-minimal' };
const REQUIRED = ['index.html', 'style.css', 'script.js', 'README.md'];
const KNOWN_EMPTY = new Set([]);
const KNOWN_EXTERNAL = {
  'tilted-grid-hero': ['pub-940ccf6255b54fa799a9b01050e6c227.r2.dev'], // image URLs built at run time
  'hero-ascii-one': ['cdn.jsdelivr.net', 'storage.googleapis.com', 'assets.unicorn.studio'], // live Unicorn Studio embed
  'chroma-glitch-preloader': ['mdn.github.io'], 'cinema-grain-preloader': ['mdn.github.io'], 'mono-contrast-preloader': ['mdn.github.io'], // 5 MB demo videos
  ...Object.fromEntries(['checker-quilt-testimonials', 'disc-cascade-carousel', 'duotone-team-roster', 'glass-fan-testimonials', 'isometric-lift-carousel',
    'spotlight-offer-quiz', 'staircase-carousel', 'tilt-cascade-carousel', 'viewfinder-flip-carousel'].map(s => [s, ['images.unsplash.com']])) // URLs built at run time
};

const KNOWN_BROKEN = {};

async function exportOne(builder, srvUrl, slug, theme) {
  const page = await builder.newPage();
  try {
    await page.goto(srvUrl + '/builder.html');
    await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
    await page.evaluate(({ slug, theme }) => {
      const sm = window.builderPreview.stackManager;
      sm.setTheme(theme);
      sm.setStack([{ id: 'export-check', slug, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]);
    }, { slug, theme });
    await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('export-check'); }, null, { timeout: 40000 });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.evaluate(() => document.getElementById('downloadZipBtn').click())
    ]);
    return fs.readFileSync(await download.path());
  } finally {
    await page.close();
  }
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4', '.webm': 'video/webm' };

/** Plain static hosting for an unpacked export, the way a client's web host would serve it. */
function serveDir(dir) {
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() })));
}

async function openFromDisk(browser, zipBytes) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(zipBytes);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-check-'));
  const problems = [];
  const notes = [];
  try {
    for (const [name, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), await entry.async('nodebuffer'));
    }
    for (const f of REQUIRED) if (!fs.existsSync(path.join(dir, f))) problems.push('ZIP is missing ' + f);
    if (problems.length) return { problems, notes };

    const site = await serveDir(dir);
    const origin = new URL(site.url).origin;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', e => problems.push('page error: ' + e.message.split('\n')[0].slice(0, 160)));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push('console error: ' + m.text().slice(0, 160)); });
    page.on('requestfailed', r => {
      if (r.url().startsWith(origin)) problems.push('failed local request: ' + r.url().replace(origin, ''));
      else if (!r.url().startsWith('data:')) notes.push('external request failed: ' + r.url().slice(0, 80));
    });
    page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(origin)) notes.push('external: ' + new URL(r.url()).host); });
    page.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) problems.push(`local file missing (${r.status()}): ` + r.url().replace(origin, '')); });
    await page.goto(site.url);
    let state = 'blank';
    for (let i = 0; i < 16 && state !== 'ok'; i++) {
      await page.waitForTimeout(500);
      state = await page.evaluate(() => {
        const s = document.querySelector('.page-section');
        if (!s) return 'no section';
        return s.querySelectorAll('canvas,svg,img,video,iframe').length + s.innerText.trim().length ? 'ok' : 'blank';
      }).catch(() => 'blank');
    }
    if (state !== 'ok') problems.push('exported section is ' + state);
    const broken = await page.evaluate(() => [...document.images].filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0).map(i => i.src.split('/').slice(-2).join('/')));
    if (broken.length) problems.push('broken images: ' + broken.slice(0, 3).join(', '));
    await ctx.close();
    site.close();
    return { problems, notes: [...new Set(notes)], state };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  let slugs = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget).map(x => x.slug);
  if (get('slug')) slugs = slugs.filter(s => get('slug').split(',').includes(s));
  const which = get('themes') || 'dark';
  const themes = which === 'both' ? ['dark', 'light'] : [which];
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = slugs.flatMap(slug => themes.map(t => ({ slug, theme: t })));
  const total = jobs.length;
  const failures = [];
  const known = [];
  const fixed = [];
  const externals = {};
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    const builder = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true });
    while (jobs.length) {
      const { slug, theme } = jobs.shift();
      try {
        const bytes = await exportOne(builder, srv.url, slug, THEMES[theme]);
        const r = await openFromDisk(browser, bytes);
        const problems = KNOWN_EMPTY.has(slug) ? r.problems.filter(p => !/exported section is blank/.test(p)) : [...r.problems];
        const hosts = r.notes.filter(n => n.startsWith('external:')).map(n => n.slice(10));
        const unexpected = hosts.filter(h => !(KNOWN_EXTERNAL[slug] || []).includes(h));
        if (unexpected.length) problems.push('contacts other websites: ' + [...new Set(unexpected)].join(', '));
        if (problems.length && KNOWN_BROKEN[slug]) known.push(slug);
        else if (problems.length) failures.push({ slug, theme, problems });
        else if (KNOWN_BROKEN[slug]) fixed.push(slug);
        r.notes.filter(n => n.startsWith('external:')).forEach(n => { (externals[n.slice(10)] = externals[n.slice(10)] || new Set()).add(slug); });
      } catch (e) {
        failures.push({ slug, theme, problems: ['export failed: ' + e.message.split('\n')[0]] });
      }
    }
    await builder.close();
  }));
  await browser.close();
  await srv.close();
  console.log(`${total - failures.length - known.length}/${total} exports open cleanly when hosted (${themes.join(' + ')} theme); ${new Set(known).size} known broken.`);
  new Set(known).forEach(s => console.log(`  known broken: ${s}: ${KNOWN_BROKEN[s]}`));
  new Set(fixed).forEach(s => console.log(`  note: ${s} now exports cleanly; remove it from KNOWN_BROKEN`));
  failures.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(f => console.log(`  ✗ ${f.slug} [${f.theme}]: ${f.problems.slice(0, 3).join(' | ')}`));
  const hosts = Object.entries(externals).map(([h, s]) => `${h} (${s.size})`);
  if (hosts.length) console.log('External hosts contacted by exports: ' + hosts.join(', '));
  process.exit(failures.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
