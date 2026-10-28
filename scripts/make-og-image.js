#!/usr/bin/env node
/**
 * Draws the picture shown when a page of the site is shared (site/img/og.png, 1200 x 630): the poster mark
 * (sun and arch) and the name, in the site's own colours and fonts. Run it again after changing the look.
 *   node scripts/make-og-image.js
 */
const fs = require('fs');
const path = require('path');
const { launchBrowser } = require('./lib/browser');

const SITE = path.resolve(__dirname, '..', 'site');
const OUT = path.join(SITE, 'img', 'og.png');

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${SITE}/styles/fonts.css">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #1f5c5a; color: #f4ead3; position: relative; overflow: hidden; font-family: 'Work Sans', sans-serif; }
  .name { position: absolute; left: 80px; top: 96px; font: 400 150px/1 'Gloock', Georgia, serif; letter-spacing: -0.01em; }
  .line { position: absolute; left: 84px; top: 300px; width: 560px; font: 400 44px/1.25 'Gloock', Georgia, serif; color: #e2a627; }
  .where { position: absolute; left: 84px; bottom: 72px; font-size: 26px; letter-spacing: 0.06em; text-transform: uppercase; }
  .sun { position: absolute; left: 878px; top: 70px; width: 270px; height: 270px; border-radius: 50%; background: #e2a627; }
  .arch { position: absolute; left: 770px; top: 230px; width: 380px; height: 400px; background: #c4522a; border-radius: 190px 190px 0 0; }
  .arch::after { content: ""; position: absolute; left: 84px; right: 84px; bottom: 0; top: 56px; background: #f4ead3; border-radius: 106px 106px 0 0; }
</style></head><body>
<div class="name">edvlabs</div>
<div class="line">A good page for a good small business</div>
<div class="where">Made in Latvia</div>
<div class="sun"></div><div class="arch"></div>
</body></html>`;

(async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    const tmp = path.join(SITE, 'img', '.og-source.html');
    fs.writeFileSync(tmp, html);
    await page.goto('file://' + tmp);
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT, type: 'png' });
    fs.unlinkSync(tmp);
  } finally { await browser.close(); }
  console.log('wrote', path.relative(process.cwd(), OUT), fs.statSync(OUT).size, 'bytes');
})();
