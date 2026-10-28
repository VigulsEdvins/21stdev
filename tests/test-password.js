/* Password rules and strength (site/js/password.js). */
const assert = require('assert');
const P = require('../site/js/password.js');
const lvl = (p, email) => P.check(p, { email }).level;
const ok = (p, email) => P.check(p, { email }).allOk;

// the rules, one by one
let c = P.check('');
assert.strictEqual(c.level, 'empty'); assert(!c.allOk && c.rules.every((r) => !r.ok) && c.notes.length === 0);
const missing = (p) => P.check(p).rules.filter((r) => !r.ok).map((r) => r.id);
assert.deepStrictEqual(missing('Ab1!'), ['length']);
assert.deepStrictEqual(missing('abcdefgh1!'), ['upper']);
assert.deepStrictEqual(missing('ABCDEFGH1!'), ['lower']);
assert.deepStrictEqual(missing('Abcdefghij!'), ['digit']);
assert.deepStrictEqual(missing('Abcdefghij1'), ['symbol']);
assert.deepStrictEqual(missing('Abcdef ghi1'), [], 'a space counts as a symbol');
assert.deepStrictEqual(missing('Zażółć-gęślą-1'), [], 'letters from other languages are fine next to the rest');
assert(ok('Tr1cky-Pass!') && !ok('Short1!a') && !ok('nouppercase-1-here') && !ok('NOLOWERCASE-1-HERE'));
const long = 'Aa1!' + 'x'.repeat(80); assert(!ok(long) && P.check(long).tooLong && /too long/.test(P.problem(long)));
console.log('  ✓ every rule is checked on its own, and a space or another alphabet is fine');

// strength levels
assert.strictEqual(lvl('Ab1!'), 'low', 'fails the rules: low');
assert.strictEqual(lvl('abcdefghijkl'), 'low', 'long but only lowercase: low');
assert.strictEqual(lvl('Tr1cky-Pa'), 'low', '9 characters: low');
assert.strictEqual(lvl('Tr1cky-Pass'), 'medium', '11 characters with all kinds: medium');
assert.strictEqual(lvl('Tr1cky-Pass-Yes'), 'high', '15 characters with all kinds: high');
assert.strictEqual(lvl('Blue-Kettle-Rides-93!'), 'high');
assert(P.check('Blue-Kettle-Rides-93!').score > P.check('Tr1cky-Pass').score, 'longer scores higher');
console.log('  ✓ low, medium and high follow length and variety');

// weak habits
assert.strictEqual(lvl('Password123!'), 'low', 'a common word dressed up is low');
assert.strictEqual(lvl('P@ssw0rd-2026!'), 'low', 'leet speak does not hide a common word');
assert.strictEqual(lvl('Qwerty-Qwerty-1!'), 'low');
assert(P.check('Password123!').notes.some((n) => /common word/.test(n)));
assert(P.check('Xylo-aaa-Mind-7!').score < P.check('Xylo-Aab-Mind-7!').score, 'three in a row costs a point');
assert(P.check('Xylo-1234-Mind-q!').notes.some((n) => /runs/.test(n)), 'runs are noticed');
assert.strictEqual(lvl('Edvins-Lives-In-Riga-9!', 'edvins@example.com'), 'medium', 'the email name inside the password costs strength');
assert.strictEqual(lvl('Edvins-Lives-In-Riga-9!', 'someone@example.com'), 'high', 'the same password is high for someone else');
assert(P.check('Edvins-Lives-In-Riga-9!', { email: 'edvins@example.com' }).notes.some((n) => /email address/.test(n)));
console.log('  ✓ common words, repeats, runs and your own email name pull strength down');

// advice and the one-sentence problem
assert.strictEqual(P.problem('Tr1cky-Pass-Yes'), '');
assert.strictEqual(P.problem('Tr1cky-Pass'), '', 'medium is accepted');
assert(/^That password is too easy to guess\. This is built on a very common word/.test(P.problem('Password123!')), 'passes the checklist but is a common word: refused');
assert(/too easy to guess/.test(P.problem('Edvins-Lives-In-Riga-9!', { email: 'edvins@example.com' })) === false, 'medium with the email name is still accepted (it only lowers the bar)');
assert.strictEqual(P.problem('abcdefghijkl'), 'Make the password stronger. It still needs: a capital letter (A to Z); a number (0 to 9); a symbol, like ! ? - _ # @ or a space.');
assert(/^Make the password stronger\. It still needs: at least 10 characters/.test(P.problem('Ab1!')));
assert(P.check('Tr1cky-Pass').notes.some((n) => /longer password/.test(n)), 'tells how to get to high');
assert(!P.check('Blue-Kettle-Rides-93!').notes.some((n) => /longer password/.test(n)), 'no advice needed once it is long');
for (const t of ['abc', 'Password123!', 'Tr1cky-Pass', '']) for (const n of P.check(t).notes.concat(P.problem(t))) assert(!/[<>]|undefined|\bid\b/.test(n), 'plain wording: ' + n);
console.log('  ✓ plain-words advice and one clear sentence for what is missing');
console.log('password ok');
