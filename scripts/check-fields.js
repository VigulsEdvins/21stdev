#!/usr/bin/env node
/**
 * Content-field check: renders every feature that declares `customizable` fields in the real builder and fails
 * when a field's selector matches nothing (the Content tab would silently drop it), or matches an element of the
 * wrong kind (an image field on a non-<img>, a link field on a non-link).
 *   npm run check-fields [-- --slug a,b] [--concurrency 4]
 */
const path = require('path');
const { startServer, launchBrowser } = require('./lib/browser');

const ROOT = path.resolve(__dirname, '..');

async function main() {
  const argv = process.argv.slice(2);
  const get = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
  let items = require(path.join(ROOT, 'registry.json')).items.filter(x => !x.isWidget && (x.customizable || []).length);
  if (get('slug')) items = items.filter(x => get('slug').split(',').includes(x.slug));
  const srv = await startServer();
  const browser = await launchBrowser();
  const jobs = [...items];
  const bad = [];
  let fields = 0;
  await Promise.all(Array.from({ length: Number(get('concurrency') || 4) }, async () => {
    while (jobs.length) {
      const item = jobs.shift();
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      try {
        await page.goto(srv.url + '/builder.html');
        await page.waitForFunction(() => window.builderPreview && document.querySelector('iframe'));
        await page.evaluate((s) => window.builderPreview.stackManager.setStack([{ id: 'field-check', slug: s, sizing: { heightMode: 'auto', customHeight: 600, paddingY: 'none' } }]), item.slug);
        await page.waitForFunction(() => { const d = document.querySelector('iframe').contentDocument; return d && d.getElementById('field-check'); }, null, { timeout: 20000 });
        // components that render late (React, loading screens) get a few seconds to produce their fields
        let result = [];
        for (let i = 0; i < 12; i++) {
          await page.waitForTimeout(500);
          const frame = page.frames().find(f => f !== page.mainFrame());
          result = await frame.evaluate((defs) => {
            const root = document.getElementById('field-check');
            return defs.map(d => {
              let el = null;
              try { el = root.querySelector(d.selector); } catch (_) { return { id: d.id, problem: 'invalid selector' }; }
              if (!el) return { id: d.id, problem: 'matches nothing' };
              const tag = el.tagName.toLowerCase();
              if (d.type === 'image' && tag !== 'img' && !el.querySelector('img') && getComputedStyle(el).backgroundImage === 'none') return { id: d.id, problem: `image field on <${tag}>` };
              if (d.type === 'link' && tag !== 'a' && !el.closest('a') && !el.querySelector('a')) return { id: d.id, problem: `link field on <${tag}>` };
              return null;
            }).filter(Boolean);
          }, item.customizable);
          if (!result.length) break;
        }
        fields += item.customizable.length;
        if (result.length) bad.push({ slug: item.slug, problems: result.map(r => `${r.id}: ${r.problem}`) });
      } catch (e) {
        bad.push({ slug: item.slug, problems: ['could not render: ' + e.message.split('\n')[0]] });
      } finally {
        await ctx.close();
      }
    }
  }));
  await browser.close();
  await srv.close();
  console.log(`${items.length - bad.length}/${items.length} features have working Content fields (${fields} fields checked).`);
  bad.sort((a, b) => a.slug.localeCompare(b.slug)).forEach(b => console.log(`  ✗ ${b.slug}: ${b.problems.slice(0, 4).join(' | ')}${b.problems.length > 4 ? ` (+${b.problems.length - 4})` : ''}`));
  process.exit(bad.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
