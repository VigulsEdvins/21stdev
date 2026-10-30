/** A text field edits every line of its element, including a styled <span> (the gradient half of a headline). */
const assert = require('assert');
const Asm = require('../scripts/assembler.js');
const { launchBrowser } = require('../scripts/lib/browser');

const HEAD = `<section><h1 id="h">
        Ship interfaces with<br />
        <span class="g">perceptual depth.</span>
      </h1>
      <h2 id="q">Plain</h2>
      <p id="p">Buy <b>now</b> and <a id="l" href="#x">save</a> today</p>
      <button id="b"><span>Go</span> <svg id="i" width="8" height="8"></svg></button></section>`;
const stack = [{ id: 'sec', slug: 'x-hero', title: 'Hero', html: HEAD, css: '', js: '' }];

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setContent(Asm.assemblePreviewDocument(stack, {}, {}, {}));
  const set = (selector, value) => page.evaluate(([s, v]) => { window.__setOverrides(v === null ? [] : [{ section: 'sec', field: 'f', selector: s, type: 'text', value: v }]); }, [selector, value]);
  const read = (sel) => page.evaluate((s) => { const e = document.querySelector('#sec ' + s); return { text: e.textContent.replace(/\s+/g, ' ').trim(), html: e.innerHTML }; }, sel);

  // both lines change, each in its own part: the gradient span keeps its class
  await set('#h', 'First line\nSecond line');
  let r = await read('#h');
  assert.strictEqual(r.text, 'First line Second line');
  assert(/<span class="g">Second line<\/span>/.test(r.html), 'second line stays in the gradient span: ' + r.html);

  // one line typed: the first line takes it, the second is emptied (nothing of the old words is left behind)
  await set('#h', 'Only this');
  r = await read('#h');
  assert.strictEqual(r.text, 'Only this');

  // more lines than the heading has: each extra line is a new line on the page, and the next edit starts clean
  await set('#h', 'a\nb\nc');
  r = await read('#h');
  assert.strictEqual(page.evaluate ? await page.evaluate(() => document.querySelectorAll('#sec #h br').length) : 2, 2, 'three lines, two breaks: ' + r.html);
  await set('#h', 'a\nb');
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('#sec #h br').length), 1, 'the extra line is gone again');

  // an element with nothing inside: Enter in the field is a line break on the page
  await set('#q', 'one\ntwo');
  r = await read('#q');
  assert.strictEqual(r.html, 'one<br>two');
  await set('#q', 'just one');
  r = await read('#q');
  assert.strictEqual(r.html, 'just one');

  // the value the field starts with changes nothing
  await set('#h', 'Ship interfaces with\nperceptual depth.');
  r = await read('#h');
  assert.strictEqual(r.text, 'Ship interfaces with perceptual depth.');

  // inside one line only the changed words change: the bold word and the link survive.
  // The link's own words are part of the field but are never changed.
  await set('#p', 'Buy now and save today!');
  r = await read('#p');
  assert(/<b>now<\/b>/.test(r.html) && /<a id="l"[^>]*>save<\/a>/.test(r.html), 'bold word and link stay: ' + r.html);
  assert.strictEqual(r.text, 'Buy now and save today!');
  await set('#p', 'Buy later and save today');
  r = await read('#p');
  assert(/<b>later<\/b>/.test(r.html), 'the edit lands in the bold run it replaced: ' + r.html);
  assert(/<a id="l"[^>]*>save<\/a>/.test(r.html));

  // a button whose label is a span next to an icon: the label changes, the icon stays, no second label appears
  await set('#b', 'Start');
  r = await read('#b');
  assert.strictEqual(r.text, 'Start');
  assert(/<svg id="i"/.test(r.html), 'icon stays');

  // removing the override puts the original back
  await set('#h', null);
  r = await read('#h');
  assert.strictEqual(r.text, 'Ship interfaces with perceptual depth.');
  assert(/<br>/.test(r.html));

  // hide and move: counted from the original place, and Reset puts everything back
  const SIB = `<section><div id="row"><i id="m1">1</i><i id="m2">2</i><i id="m3">3</i></div></section>`;
  const page2 = await browser.newPage();
  await page2.setContent(Asm.assemblePreviewDocument([{ id: 'sec', slug: 'x-row', title: 'Row', html: SIB, css: '', js: '' }], {}, {}, {}));
  const run = (list) => page2.evaluate((l) => { window.__setOverrides(l); return Array.from(document.querySelectorAll('#row > i')).map(e => e.id + (getComputedStyle(e).display === 'none' ? '(hidden)' : '')).join(','); }, list);
  const ov = (id, type, value) => ({ section: 'sec', field: id + '__' + type, selector: '#' + id, type, value });
  assert.strictEqual(await run([ov('m1', 'move', '1')]), 'm2,m1,m3');
  assert.strictEqual(await run([ov('m1', 'move', '2')]), 'm2,m3,m1', 'counts from the original place, not from the last edit');
  assert.strictEqual(await run([ov('m1', 'move', '9')]), 'm2,m3,m1', 'stops at the end');
  assert.strictEqual(await run([ov('m3', 'move', '-1')]), 'm1,m3,m2');
  assert.strictEqual(await run([ov('m2', 'hide', '1')]), 'm1,m2(hidden),m3');
  assert.strictEqual(await run([ov('m2', 'hide', '1'), ov('m2', 'move', '1')]), 'm1,m3,m2(hidden)');
  assert.strictEqual(await run([]), 'm1,m2,m3', 'removing the settings puts it back, shown');
  // placed by hand: a percent of the block's width, restored when the setting goes
  await page2.setViewportSize({ width: 800, height: 600 });
  await run([ov('m2', 'shift', '10|5')]);
  const tr = () => page2.evaluate(() => document.getElementById('m2').style.translate);
  const w = await page2.evaluate(() => document.getElementById('sec').getBoundingClientRect().width);
  assert.strictEqual(await tr(), +(10 * w / 100).toFixed(1) + 'px ' + +(5 * w / 100).toFixed(1) + 'px');
  await page2.setViewportSize({ width: 400, height: 600 });
  await page2.waitForTimeout(100);
  const w3 = await page2.evaluate(() => document.getElementById('sec').getBoundingClientRect().width);
  assert.strictEqual(await tr(), +(10 * w3 / 100).toFixed(1) + 'px ' + +(5 * w3 / 100).toFixed(1) + 'px', 'follows the width');
  await run([ov('m2', 'shift', 'javascript:1')]);
  assert.strictEqual(await tr(), '', 'a wrong value is ignored');
  await run([ov('m2', 'shift', '10|5')]);
  await run([]);
  assert.strictEqual(await tr(), '', 'removed');

  await browser.close();
  console.log('✅ Text fields edit every line passed!');
})().catch(e => { console.error(e); process.exit(1); });
