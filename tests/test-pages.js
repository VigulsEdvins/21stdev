// Multi-page state: add, switch, rename, duplicate, remove, restore.
const assert = require('assert');
const { createStackManager } = require('../scripts/stack-manager.js');

const sm = createStackManager();
assert.deepStrictEqual(sm.getPages(), [], 'a new project is a single page');
const a = sm.addSection('hero-a');
const b = sm.addSection('hero-b');

const about = sm.addPage('About us');
const pages = sm.getPages();
assert.strictEqual(pages.length, 2);
assert.strictEqual(pages[0].title, 'Home');
assert.strictEqual(pages[0].slug, 'index', 'the first page is the home page');
assert.deepStrictEqual(pages[0].stack.map(s => s.id), [a.id, b.id], 'the old stack became Home');
assert.strictEqual(about.slug, 'about-us');
assert.strictEqual(sm.getActivePageId(), about.id);
assert.deepStrictEqual(sm.getStack(), [], 'the new page starts empty');

const c = sm.addSection('about-hero');
sm.switchPage(pages[0].id);
assert.deepStrictEqual(sm.getStack().map(s => s.id), [a.id, b.id], 'switching restores that page');
sm.switchPage(about.id);
assert.deepStrictEqual(sm.getStack().map(s => s.id), [c.id], 'edits to a page are kept');
assert.deepStrictEqual(sm.getPages().find(p => p.id === about.id).stack.map(s => s.id), [c.id], 'getPages shows the live stack of the active page');
assert.strictEqual(sm.getState().pages.length, 2);
assert.strictEqual(sm.getState().activePageId, about.id);

const second = sm.addPage('About us');
assert.strictEqual(second.slug, 'about-us-2', 'slugs stay unique');
sm.renamePage(second.id, 'Contact');
assert.strictEqual(sm.getPages().find(p => p.id === second.id).slug, 'contact');
sm.renamePage(pages[0].id, 'Start');
assert.strictEqual(sm.getPages()[0].slug, 'index', 'renaming Home keeps index.html');
assert.strictEqual(sm.addPage('Index').slug, 'page', '"index" is reserved for the home page');

sm.switchPage(about.id);
const copy = sm.duplicatePage(about.id);
const copyStack = sm.getStack();
assert.strictEqual(copyStack.length, 1);
assert.notStrictEqual(copyStack[0].id, c.id, 'duplicated sections get new ids');
assert.strictEqual(copy.title, 'About us copy');
sm.setPageMeta(copy.id, { description: 'x'.repeat(400) });
assert.strictEqual(sm.getPages().find(p => p.id === copy.id).description.length, 300);

const saved = sm.getPages();
const savedActive = sm.getActivePageId();
const restored = createStackManager();
restored.setPages(saved, savedActive);
assert.deepStrictEqual(restored.getStack().map(s => s.slug), copyStack.map(s => s.slug), 'restore puts the active page on screen');
assert.strictEqual(restored.getPages().length, saved.length);

assert.strictEqual(sm.removePage(copy.id), true);
assert(sm.getActivePageId() && sm.getPages().some(p => p.id === sm.getActivePageId()), 'removing the active page activates another');
while (sm.getPages().length > 1) sm.removePage(sm.getPages()[sm.getPages().length - 1].id);
assert.deepStrictEqual(sm.getPages(), [], 'down to one page, the project is single-page again');
assert(sm.getStack().length > 0, 'and keeps that page content');
assert.strictEqual(sm.removePage('nope'), false);
console.log('✅ Pages state tests passed!');

// header and footer of one page copied to the others
{
  const { applySharedChrome } = require('../scripts/builder/page-tabs.js');
  const cat = { 'nav-a': 'Headers & Nav', 'foot-a': 'Footers & Endings', 'nav-b': 'Headers & Nav', 'body-1': 'Heroes', 'body-2': 'Heroes' };
  const categoryOf = (s) => cat[s.slug] || '';
  const home = { id: 'h', title: 'Home', stack: [{ id: '1', slug: 'nav-a', overrides: { x: { value: 'Home logo' } } }, { id: '2', slug: 'body-1' }, { id: '3', slug: 'foot-a' }] };
  const other = { id: 'o', title: 'Other', stack: [{ id: '4', slug: 'nav-b' }, { id: '5', slug: 'body-2' }] };
  const bare = { id: 'b', title: 'Bare', stack: [{ id: '6', slug: 'body-2' }] };
  const out = applySharedChrome([home, other, bare], 'h', categoryOf);
  assert.deepStrictEqual(out[0], home, 'the open page is untouched');
  assert.deepStrictEqual(out[1].stack.map(s => s.slug), ['nav-a', 'body-2', 'foot-a'], 'header replaced, footer added');
  assert.deepStrictEqual(out[2].stack.map(s => s.slug), ['nav-a', 'body-2', 'foot-a'], 'a page without either gets both, header first');
  assert.strictEqual(out[1].stack[0].overrides.x.value, 'Home logo', 'content edits travel with the copy');
  assert.notStrictEqual(out[1].stack[0].id, '1', 'copies get their own ids');
  assert.strictEqual(new Set(out.flatMap(p => p.stack.map(s => s.id))).size, out.flatMap(p => p.stack).length, 'all ids unique');
  console.log('✅ Shared header/footer tests passed!');
}
