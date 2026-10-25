#!/usr/bin/env node
/**
 * Finds components whose script renders most of the page (an empty `#root` that fills in later) and records how
 * tall they become as `reserveHeight` in their meta.json. The exporter reserves that space (capped at one screen)
 * so a hero that appears after load does not push the sections below it down (layout shift).
 *   node scripts/measure-reserve.js [--slug a,b]
 * Heights are measured on a desktop and a phone viewport; the smaller one is stored.
 *
 * It also marks `lazy: true` on heavy components that are exactly one screen tall with or without their script:
 * an export starts those only when they are about to scroll into view, and nothing moves when they do.
 */
const fs = require('fs');
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');
const VIEWPORTS = [{ width: 1280, height: 800 }, { width: 390, height: 844 }];

const height = (page) => page.evaluate(() => ({
  h: Math.round(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)),
  nodes: document.body.querySelectorAll('*:not(script):not(style)').length,
  canvas: document.body.querySelectorAll('canvas').length
}));

async function measure(browser, url, viewport, javaScriptEnabled) {
  const ctx = await browser.newContext({ viewport, javaScriptEnabled, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    if (javaScriptEnabled) await page.waitForTimeout(1800);
    return await height(page);
  } finally { await ctx.close(); }
}

(async () => {
  const argv = process.argv.slice(2);
  const only = argv.includes('--slug') ? argv[argv.indexOf('--slug') + 1].split(',') : null;
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8'));
  const slugs = registry.items.filter(i => !i.isWidget && i.type !== 'template' && (!only || only.includes(i.slug))).map(i => i.slug);
  const srv = await startServer();
  const browser = await launchBrowser();
  const queue = slugs.slice();
  const out = {};
  const lazy = {};
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const slug = queue.shift();
      const url = `${srv.url}/features/${slug}/index.html`;
      try {
        const sizes = [];
        for (const vp of VIEWPORTS) {
          const bare = await measure(browser, url, vp, false);
          const full = await measure(browser, url, vp, true);
          sizes.push({ bare, full });
        }
        // script-rendered: without JS the page is an empty shell (a root and nothing else), with JS it is tall and full
        const rendered = sizes.every(s => s.full.h >= 240 && s.bare.nodes <= 3 && s.full.nodes > 10);
        out[slug] = rendered ? Math.min(...sizes.map(s => s.full.h)) : 0;
        const item = registry.items.find(i => i.slug === slug);
        // exactly one screen tall before and after the script (nothing for the layout to change when it starts late)
        const oneScreen = sizes.every((s, i) => Math.abs(s.full.h - VIEWPORTS[i].height) <= VIEWPORTS[i].height * 0.02 && Math.abs(s.bare.h - s.full.h) <= VIEWPORTS[i].height * 0.02);
        lazy[slug] = !!(item && item.weight === 'heavy' && !/preloader/i.test(slug + ' ' + item.category) && oneScreen);
      } catch (e) { console.error(`✗ ${slug}: ${e.message.split('\n')[0]}`); }
    }
  }));
  await browser.close();
  await srv.close();
  let changed = 0;
  for (const [slug, h] of Object.entries(out)) {
    const file = path.join(ROOT, 'features', slug, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(file, 'utf8'));
    if ((meta.reserveHeight || 0) === h && !!meta.lazy === !!lazy[slug]) continue;
    if (h) meta.reserveHeight = h; else delete meta.reserveHeight;
    if (lazy[slug]) meta.lazy = true; else delete meta.lazy;
    fs.writeFileSync(file, JSON.stringify(meta, null, 2) + '\n');
    changed++;
  }
  console.log(`${Object.values(out).filter(Boolean).length} script-rendered components, ${Object.values(lazy).filter(Boolean).length} start lazily; ${changed} meta.json files updated. Run \`npm run sync\`.`);
})().catch(e => { console.error(e); process.exit(1); });
