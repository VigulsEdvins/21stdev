#!/usr/bin/env node
/**
 * Measure live sites for a layout/motion replica, in one pass per site.
 *   node scripts/replica/research.js <url> [url...]
 * Writes reports/replica/<host>/: v0..v8.png (1440x900 every 900px, overlays hidden),
 * sheet.jpg (contact sheet), summary.md (compact: stack, fonts, colours, type styles,
 * section boxes, animations, header and hover behaviour). Read summary.md + sheet.jpg, not the PNGs.
 * Never bypasses bot protection: a blocked site is reported and skipped.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { launchBrowser } = require('../lib/browser');

const OUT = path.join(__dirname, '..', '..', 'reports', 'replica');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
// Narrow on purpose: broad [class*=modal] once hid a whole page wrapper.
const HIDE = '[id*=ookie],[class*=ookie],[id*=onsent],[class*=onsent],[class*=cmplz],#usercentrics-root,#CybotCookiebotDialog,[id*=klaviyo],[class*=klaviyo],[id*=launcher],[aria-modal=true]{display:none!important}';
const DECLINE = ['Reject all', 'Decline', 'Deny', 'Only necessary', 'Necessary only', 'Reject', 'Decline non essential', 'Close'];

const animsInPage = () => {
  const sel = el => !el || !el.tagName ? '?' : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  return document.getAnimations().slice(0, 60).map(a => {
    const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
    const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
    const props = kf.length ? Object.keys(kf[0]).filter(k => !/offset|easing|composite/.test(k)) : [];
    const span = props.map(p => `${p}:${kf[0][p]}→${kf[kf.length - 1][p]}`).join(' ');
    return `${a.animationName || a.transitionProperty || 'anim'} | ${sel(a.effect && a.effect.target)} | ${Math.round(t.duration)}ms ${t.delay ? '+' + t.delay + 'ms ' : ''}${kf[1] && kf[1].easing !== 'linear' ? kf[0].easing : t.easing}${t.iterations === Infinity ? ' ∞' : ''} | ${span}`.slice(0, 220);
  });
};

async function one(browser, url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const dir = path.join(OUT, host);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
  const page = await ctx.newPage();
  const scripts = new Set();
  page.on('response', r => { if (r.request().resourceType() === 'script') scripts.add(new URL(r.url()).hostname + new URL(r.url()).pathname.split('/').pop()); });
  const L = [];
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const loadAnims = []; for (const ms of [300, 1200]) { await page.waitForTimeout(ms); loadAnims.push(...await page.evaluate(animsInPage)); }
    await page.waitForTimeout(3000);
    const title = await page.title();
    if (/attention required|forbidden|access denied|just a moment/i.test(title)) throw new Error('blocked by bot protection: ' + title);
    for (const t of DECLINE) { const b = page.getByRole('button', { name: t }).first(); if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; } }
    await page.addStyleTag({ content: HIDE }).catch(() => {});

    const header = () => { const h = document.querySelector('header, nav, [class*=header], [class*=navbar]'); if (!h) return 'none'; const s = getComputedStyle(h); return `${s.position} h=${h.offsetHeight} bg=${s.backgroundColor} color=${s.color}${s.backdropFilter !== 'none' ? ' backdrop=' + s.backdropFilter : ''}`; };
    const headTop = await page.evaluate(header);
    const scrollAnims = new Set();
    for (let i = 0; i < 18; i++) { await page.mouse.wheel(0, 700); await page.waitForTimeout(250); (await page.evaluate(animsInPage)).forEach(a => scrollAnims.add(a)); }
    const headScrolled = await page.evaluate(header);
    const st = await page.evaluate(() => window.ScrollTrigger ? ScrollTrigger.getAll().slice(0, 20).map(s => `${(s.trigger && s.trigger.className + '').slice(0, 40)} start=${s.vars.start} end=${s.vars.end} scrub=${s.vars.scrub} pin=${!!s.vars.pin}`) : []);

    // Layout dump at page coordinates, after reveals have fired.
    const facts = await page.evaluate(() => {
      const g = window, d = document;
      const libs = Object.entries({ gsap: g.gsap, ScrollTrigger: g.ScrollTrigger, lenis: g.lenis || g.Lenis || d.documentElement.classList.contains('lenis'), three: g.THREE, swiper: g.Swiper || d.querySelector('.swiper'), webflow: g.Webflow, framer: d.querySelector('[data-framer-name]'), shopify: g.Shopify, next: g.__NEXT_DATA__ || d.querySelector('#__next') }).filter(([, v]) => v).map(([k]) => k);
      const fonts = {}, bgs = {}, fgs = {}, styles = {}, boxes = [];
      for (const e of d.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect(); if (r.width < 24 || r.height < 12) continue;
        const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
        const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
        const top = Math.round(r.top + scrollY);
        if (own) {
          const fam = s.fontFamily.split(',')[0].replace(/"/g, '');
          fonts[fam] = (fonts[fam] || 0) + 1; fgs[s.color] = (fgs[s.color] || 0) + 1;
          const key = `${fam} ${s.fontSize}/${s.lineHeight} w${s.fontWeight}${s.letterSpacing !== 'normal' ? ' ls' + s.letterSpacing : ''}${s.textTransform !== 'none' ? ' ' + s.textTransform : ''}${s.fontStyle !== 'normal' ? ' italic' : ''}`;
          if (!styles[key]) styles[key] = { n: 0, tag: e.tagName.toLowerCase(), ex: own.slice(0, 40), color: s.color };
          styles[key].n++;
        }
        if (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && r.width * r.height > 40000) bgs[s.backgroundColor] = (bgs[s.backgroundColor] || 0) + 1;
        if (r.width >= 1200 && r.height >= 150 && (/^(SECTION|HEADER|FOOTER|MAIN)$/.test(e.tagName) || s.backgroundColor !== 'rgba(0, 0, 0, 0)')) boxes.push(`y=${top} h=${Math.round(r.height)} ${e.tagName.toLowerCase()}.${(e.className + '').split(' ')[0].slice(0, 30)} bg=${s.backgroundColor} pad=${s.padding}`);
        if (/^H[1-3]$/.test(e.tagName) && own) boxes.push(`  y=${top} x=${Math.round(r.left)} w=${Math.round(r.width)} ${e.tagName} "${own.slice(0, 50)}"`);
        if ((e.tagName === 'A' || e.tagName === 'BUTTON') && (s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.borderTopWidth !== '0px') && own && r.height > 28) boxes.push(`  y=${top} btn "${own.slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)} bg=${s.backgroundColor} border=${s.borderTopWidth} ${s.borderTopColor} r=${s.borderRadius} pad=${s.padding}`);
      }
      const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
      return { libs, height: d.documentElement.scrollHeight, fonts: top(fonts, 5), bgs: top(bgs, 8), fgs: top(fgs, 8), styles: Object.entries(styles).sort((a, b) => b[1].n - a[1].n).slice(0, 18).map(([k, v]) => `${v.tag} ${k} ${v.color} ×${v.n} "${v.ex}"`), boxes: [...new Set(boxes)].slice(0, 120) };
    });

    // Hover probes: what changes and with which transition.
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800);
    const hovers = [];
    for (const s of ['header a', 'a[class*=btn], a[class*=button], button', '[class*=card]', 'img']) {
      const el = page.locator(s).filter({ visible: true }).first();
      if (!(await el.count())) continue;
      const read = () => el.evaluate(e => { const c = getComputedStyle(e); return { bg: c.backgroundColor, color: c.color, tf: c.transform, op: c.opacity, tr: c.transition }; }).catch(() => null);
      const a = await read(); await el.hover({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(800); const b = await read();
      if (a && b) { const diff = Object.keys(b).filter(k => k !== 'tr' && a[k] !== b[k]).map(k => `${k}:${a[k]}→${b[k]}`); hovers.push(`${s}: ${diff.join(' ') || 'no change'} | transition ${a.tr}`); }
    }

    // Reference screenshots at fixed scroll positions.
    const H = facts.height;
    for (let i = 0, y = 0; i < 9 && y < H; i++, y += 900) {
      await page.evaluate(v => scrollTo(0, v), y); await page.mouse.wheel(0, 1); await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(dir, `v${i}.png`) });
    }
    const shots = fs.readdirSync(dir).filter(f => /^v\d\.png$/.test(f)).sort().map(f => path.join(dir, f));
    execFileSync('montage', [...shots, '-tile', '3x', '-geometry', '600x375+3+3', path.join(dir, 'sheet.jpg')]);

    L.push(`# ${host} — ${title}`, `height ${H}px · stack: ${facts.libs.join(', ') || 'plain'} · scripts: ${[...scripts].filter(s => /gsap|lenis|swiper|webflow|framer|locomotive|barba|three|aos|splide|tiny-slider|lottie/i.test(s)).join(', ') || '-'}`,
      `fonts: ${facts.fonts.join(' · ')}`, `backgrounds: ${facts.bgs.join(' · ')}`, `text colours: ${facts.fgs.join(' · ')}`,
      `header: top ${headTop} → scrolled ${headScrolled}`, '', '## Type styles (most used first)', ...facts.styles.map(s => '- ' + s),
      '', '## Sections, headings, buttons (page px)', ...facts.boxes, '', '## Animations on load', ...[...new Set(loadAnims)].slice(0, 25).map(a => '- ' + a),
      '', '## Animations while scrolling', ...[...scrollAnims].filter(a => !loadAnims.includes(a)).slice(0, 30).map(a => '- ' + a),
      '', '## ScrollTrigger', ...(st.length ? st.map(s => '- ' + s) : ['- none']), '', '## Hover', ...hovers.map(h => '- ' + h));
    fs.writeFileSync(path.join(dir, 'summary.md'), L.join('\n') + '\n');
    console.log(`ok  ${host}  ${H}px  ${facts.libs.join(',')}  -> reports/replica/${host}/summary.md`);
  } catch (e) {
    console.log(`SKIP ${host}: ${e.message.split('\n')[0]}`);
  }
  await ctx.close();
}

(async () => {
  const urls = process.argv.slice(2);
  if (!urls.length) { console.log('Usage: node scripts/replica/research.js <url> [url...]'); process.exit(1); }
  const browser = await launchBrowser();
  for (const u of urls) await one(browser, u);
  await browser.close();
})();
