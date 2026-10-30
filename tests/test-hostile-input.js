// Hostile input: text a customer types (or a project file carries) into every field that reaches the page head,
// the preview or the exported site. Nothing may break out of its tag or turn into a runnable address.
const assert = require('assert');
const A = require('../scripts/assembler.js');
const { sanitizeState } = require('../scripts/project-sanitize.js');

const BREAK = '"><script>alert(1)</script><img src=x onerror=alert(2)>';
const BIG = 'A'.repeat(200000);

// 1. Page settings: title, description, share image, canonical, favicon, fonts, business fields
const made = A.renderPageHead({
  title: BREAK, description: BREAK, shareImage: 'https://x.test/a.png' + BREAK, canonical: 'https://x.test/' + BREAK,
  favicon: BREAK, fontDisplay: BREAK, fontBody: "x';}</style><script>alert(3)</script>",
  bizType: 'LocalBusiness', bizName: '</script><script>alert(4)</script>', bizPhone: BREAK, bizAddress: BREAK,
  alternates: [{ lang: BREAK, href: 'https://x.test/' + BREAK }]
});
const head = made.headTags;
assert(!/<\/style>|<script/i.test(made.css) && !made.css.includes('<'), 'the page styles carry no markup');
assert(!/<script(?![^>]*application\/ld\+json)/i.test(head), 'no script tag appears in the head except the data block');
assert(!/<img/i.test(head), 'no image tag injected into the head');
assert.strictEqual((head.match(/<script/gi) || []).length, 1, 'only the JSON-LD block is a script');
assert.strictEqual((head.match(/<\/script>/gi) || []).length, 1, 'no value closes the JSON-LD script early');
assert(!/<\/style>/i.test(head.replace(/<style[\s\S]*?<\/style>/, '')), 'no value closes a style tag');
const tagStarts = head.match(/<[^>\s]*/g) || [];
assert(tagStarts.every(t => /^<(\/?title|meta|link|\/?script)$/.test(t)), 'every "<" in the head starts a known tag, never an injected one: ' + tagStarts.join(' '));
const attrs = head.match(/<(?:meta|link)\b[^>]*>/g) || [];
assert(attrs.every(a => (a.match(/"/g) || []).length % 2 === 0 && !/"[^"]*"\w/.test(a.replace(/="[^"]*"/g, '=""'))), 'no value breaks out of its attribute quotes');

// 2. Business data block: "<" never appears inside it
const ld = A.renderJsonLd({ bizType: 'Organization', bizName: '</script><b>', bizAddress: '</script>' }, 't');
assert.strictEqual(ld.replace('<script type="application/ld+json">', '').replace(/<\/script>$/, '').includes('<'), false, 'JSON-LD content has no raw "<"');

// 3. Content overrides: links and images never carry javascript:, vbscript: or non-image data:
const ov = (type, value) => ({ id: 's1', slug: 'a', overrides: { f: { selector: 'a', type, value } } });
const cases = ['javascript:alert(1)', ' JaVa\tScRiPt:alert(1)', 'java\nscript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html;base64,PHNjcmlwdD4=', '\u0001javascript:alert(1)'];
cases.forEach(v => {
  ['link', 'image'].forEach(t => {
    assert.strictEqual(A.collectOverrides([ov(t, v)])[0].value, '#', `${t} value ${JSON.stringify(v)} is refused`);
  });
});
['https://ok.test/a', '/local/page', 'mailto:a@b.test', 'tel:+3712000000', '#top', 'data:image/png;base64,AAAA', 'page:about'].forEach(v => {
  assert.strictEqual(A.collectOverrides([ov('link', v)])[0].value, v, `${v} still works as a link`);
});
assert.strictEqual(A.collectOverrides([ov('text', 'javascript:ok')])[0].value, 'javascript:ok', 'words are not addresses');

// 4. Text that closes the script tag does not close it in a page that carries the script inline
const html = A.generateSingleFileBundle(
  [{ id: 's1', slug: 'a', html: '<p>x</p>', css: '', js: '', overrides: { f: { selector: 'p', type: 'text', value: '</script><script>alert(5)</script>' } } }],
  A.THEME_PRESETS['midnight-dark'], {}, { page: { title: 'T' } }
);
assert(!html.includes('</script><script>alert(5)'), 'an override value cannot close the page script');

// 5. A project file: prototype-pollution keys, huge values, hostile text in every field
const polluted = JSON.parse('{"__proto__":{"polluted":1},"stack":[{"id":"a","slug":"ok-one","overrides":{"__proto__":{"selector":"p","value":"x"},"constructor":{"selector":"p","value":"x"}},"elements":[{"id":"e1","type":"text","__proto__":{"polluted":2},"constructor":"x"}]}],"page":{"__proto__":{"polluted":3},"title":"' + BIG + '"}}');
const clean = sanitizeState(polluted);
assert.strictEqual({}.polluted, undefined, 'Object.prototype was not polluted');
assert.strictEqual(clean.state.page.title.length, 1000, 'page title is cut to its limit');
assert(clean.removed > 0, 'the cleaner reports what it dropped');
const big = sanitizeState({ stack: Array.from({ length: 5000 }, (_, i) => ({ id: 's' + i, slug: 'ok-one' })) });
assert(big.state.stack.length <= 200, 'a project with thousands of sections is cut');

console.log('hostile input: ok');

// the link name and automatic menu settings of a section survive saving, cleaned; nothing else gets through
(function () {
  const strict = require('assert');
  const { sanitizeState } = require('../scripts/project-sanitize.js');
  const st = sanitizeState({ stack: [
    { id: 'a1', slug: 'about-story', anchor: 'our-story', menuMode: 'auto', inMenu: false, menuLabel: 'Plans <b>and</b>   prices' },
    { id: 'a2', slug: 'about-story', anchor: '"><script>', menuMode: 'sneaky', inMenu: true, menuLabel: '<i></i>' }
  ] }).state;
  strict.strictEqual(st.stack[0].anchor, 'our-story');
  strict.strictEqual(st.stack[0].menuMode, 'auto');
  strict.strictEqual(st.stack[0].inMenu, false);
  strict.strictEqual(st.stack[0].menuLabel, 'Plans and prices');
  ['anchor', 'menuMode', 'inMenu', 'menuLabel'].forEach(k => strict(!(k in st.stack[1]), k + ' is not kept when it is not valid'));
})();
