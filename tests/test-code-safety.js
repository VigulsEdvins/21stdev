// The safety scan catches the patterns it promises to, and the vault is clean.
const assert = require('assert');
const { scan, scanText, isBundle } = require('../scripts/check-code-safety.js');

const rules = (t) => scanText('x.js', t).map(f => f.rule).sort();
assert.deepStrictEqual(rules('eval("1")'), ['eval']);
assert.deepStrictEqual(rules('const f = new Function("a", "return a")'), ['new-function']);
assert.deepStrictEqual(rules('document.write("<b>")'), ['document-write']);
assert.deepStrictEqual(rules('<script src="https://evil.example/x.js"></script>'), ['remote-script']);
assert.deepStrictEqual(rules('<script src="https://cdn.jsdelivr.net/npm/x"></script><script src="/local.js"></script>'), []);
assert.deepStrictEqual(rules('import("https://evil.example/m.js")'), ['remote-import']);
assert.deepStrictEqual(rules('window.addEventListener("message", e => { run(e.data); });'), ['message-origin']);
assert.deepStrictEqual(rules('window.addEventListener("message", e => { if (e.origin !== location.origin) return; });'), []);
assert(isBundle('(()=>{var a=1;})()') && !isBundle('const x = 1;'));
assert.deepStrictEqual(rules('retrieval(); evaluate(1)'), [], 'words that merely contain eval are fine');

const open = scan().filter(f => !f.waived);
assert.deepStrictEqual(open.map(f => `${f.file}: ${f.msg}`), [], 'the vault has no open safety findings');
console.log('✅ Code safety tests passed!');
