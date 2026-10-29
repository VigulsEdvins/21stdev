// E7.6 send the paid site to the customer's GitHub, against a pretend GitHub.
const assert = require('assert');
const crypto = require('crypto');
const A = require('../scripts/assembler.js');
const Ent = require('../functions/lib/entitlement.js');
const { push, safePath, checkFiles } = require('../functions/lib/github-push.js');
const App = require('../functions/lib/github-app.js');
const { sendToGithub } = require('../functions/lib/send-to-github.js');
const Fake = require('./lib/fake-github.js');

(async () => {
  // the same files the ZIP holds (with a picture as bytes)
  const sec = [{ id: 's1', slug: 'x', title: 'X', html: '<h1>Hi</h1>', css: '', js: '' }];
  const bundle = A.generateExportBundle(sec, { id: 'clean-minimal' }, {}, { page: { title: 'Zephyr', canonical: 'https://zephyr.example/', bizEmail: 'hi@zephyr.example' } });
  const files = Object.assign({}, bundle, { 'assets/pic.bin': new Uint8Array([0, 1, 2, 250, 255, 13, 10]) });
  const target = { owner: 'anna', repo: 'site', branch: 'main' };
  const as = (b) => Buffer.from(typeof b === 'string' ? b : b);

  // 1. a new (empty) repository: one file through the Contents API, the rest in one commit; byte for byte equal to the ZIP
  let gh = Fake.create(); gh.addRepo('anna/site');
  let r = await push(await gh.gh(gh.state.token), target, files, {});
  assert(r.ok && r.status === 'pushed', JSON.stringify(r));
  const got = gh.filesAt('anna/site');
  assert.deepStrictEqual(Object.keys(got).sort(), Object.keys(files).sort(), 'every file arrived');
  for (const [n, c] of Object.entries(files)) assert(as(c).equals(got[n]), 'same bytes: ' + n);
  assert(got['.well-known/security.txt'] && got['404.html'] && got['DEPLOY.md'], 'search and safety files are in the repo');
  assert(gh.log.every((l) => l.body === undefined || l.body.force !== true), 'never a force push');

  // 2. an existing repository with files of its own and one clash
  gh = Fake.create(); gh.addRepo('anna/site', { 'NOTES.md': 'my notes', 'index.html': 'old home page', 'src/app.js': 'keep me' });
  const before = gh.commitCount('anna/site');
  r = await push(await gh.gh(gh.state.token), target, files, {});
  assert(!r.ok && r.status === 'clash' && r.clashes.length === 1 && r.clashes[0] === 'index.html', 'the clash is listed');
  assert.strictEqual(gh.commitCount('anna/site'), before, 'nothing was written while asking');
  assert.strictEqual(gh.filesAt('anna/site')['index.html'].toString(), 'old home page');
  r = await push(await gh.gh(gh.state.token), target, files, { overwrite: true });
  assert(r.ok && r.status === 'pushed');
  const after = gh.filesAt('anna/site');
  assert.strictEqual(after['NOTES.md'].toString(), 'my notes'); assert.strictEqual(after['src/app.js'].toString(), 'keep me'); // a non-empty repo is never emptied
  assert(as(files['index.html']).equals(after['index.html']), 'index.html replaced after the answer yes');
  assert.strictEqual(gh.commitCount('anna/site'), before + 1, 'one commit, on top');
  // sending the same thing again changes nothing
  r = await push(await gh.gh(gh.state.token), target, files, {});
  assert(r.ok && r.status === 'unchanged' && gh.commitCount('anna/site') === before + 1);
  // into a folder
  gh = Fake.create(); gh.addRepo('anna/site', { 'NOTES.md': 'x' });
  r = await push(await gh.gh(gh.state.token), { ...target, folder: 'docs/site' }, files, {});
  assert(r.ok && gh.filesAt('anna/site')['docs/site/index.html'] && gh.filesAt('anna/site')['NOTES.md'], 'folder keeps the rest');

  // 3. plain results, not errors
  gh = Fake.create(); gh.addRepo('anna/site', { a: 'b' });
  assert.strictEqual((await push(await gh.gh(gh.state.token), { ...target, repo: 'gone' }, files)).status, 'repo-missing');
  assert.strictEqual((await push(await gh.gh(gh.state.token), { ...target, branch: 'nope' }, files)).status, 'branch-missing');
  gh.state.revoked = true;
  assert.strictEqual((await push(await gh.gh(gh.state.token), target, files)).status, 'access-revoked');
  gh.state.revoked = false; gh.repos.get('anna/site').archived = true;
  assert.strictEqual((await push(await gh.gh(gh.state.token), target, files)).status, 'repo-missing');

  // 4. hostile input
  for (const p of ['../x', '/etc/passwd', 'a/../b', '.git/config', 'a\\b', 'a/.git/x', '', 'a//b', 'x\u0000y']) assert(!safePath(p), 'refused path ' + JSON.stringify(p));
  assert(safePath('assets/a.png') && safePath('.well-known/security.txt'));
  assert(checkFiles({ '../evil': 'x', 'index.html': '', 'DEPLOY.md': '', '404.html': '' }));
  assert(/missing 404/.test(checkFiles({ 'index.html': 'a', 'DEPLOY.md': 'b' })));
  for (const t of [{ owner: 'a/b', repo: 'x' }, { owner: 'a', repo: '../x' }, { owner: 'a', repo: 'x', branch: 'a..b' }, { owner: 'a', repo: 'x', folder: '../up' }]) assert.strictEqual((await push(await gh.gh(gh.state.token), t, files)).status, 'invalid', JSON.stringify(t));
  assert.strictEqual(gh.log.filter((l) => /up|\.\./.test(l.path)).length, 0, 'bad targets never reach GitHub');

  // 5. the orchestrator: unpaid refused before any GitHub call; token never leaks
  gh = Fake.create(); gh.addRepo('anna/site');
  const audits = [], now = '2026-11-01T10:00:00Z';
  const deps = (over) => Object.assign({ now: () => now, limiter: async () => true, audit: async (e) => audits.push(e), mintToken: async () => gh.state.token, gh: (t) => gh.gh(t), buildFiles: async () => files }, over);
  const base = { accountId: 'u1', projectId: 'p1', installationId: '123', target, blocks: 3, editor: false };
  let res = await sendToGithub({ ...base, entitlement: null }, deps());
  assert(!res.ok && res.status === 'not-paid' && gh.log.length === 0, 'an unpaid page is refused before GitHub is called');
  const ent = Ent.create({ blocks: 3, editor: false, now });
  res = await sendToGithub({ ...base, entitlement: ent, blocks: 5 }, deps());
  assert(!res.ok && res.status === 'payment-needed' && gh.log.length === 0, 'more blocks than paid for');
  res = await sendToGithub({ ...base, entitlement: ent }, deps({ now: () => '2027-12-01T00:00:00Z' }));
  assert.strictEqual(res.status, 'expired');
  res = await sendToGithub({ ...base, entitlement: ent }, deps({ limiter: async () => false }));
  assert.strictEqual(res.status, 'rate-limited'); assert.strictEqual(gh.log.length, 0);
  res = await sendToGithub({ ...base, entitlement: ent }, deps());
  assert(res.ok && res.status === 'pushed');
  const blob = JSON.stringify([res, audits]);
  assert(!blob.includes(gh.state.token), 'no token in the result or the audit events');
  assert(audits.length === 1 && audits[0].type === 'github.push' && audits[0].outcome === 'pushed' && audits[0].files > 5, 'one audit event per push');
  res = await sendToGithub({ ...base, entitlement: ent }, deps({ mintToken: async () => { throw new Error('boom ' + gh.state.token); } }));
  assert(res.status === 'access-revoked' && !JSON.stringify([res, audits]).includes(gh.state.token), 'a failed token is a plain message');

  // 6. the app token: a real RS256 JWT, asking only for contents write
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const jwt = await App.appJwt({ appId: 77, privateKey: pem, now: Date.parse(now) });
  const [h, c, s] = jwt.split('.');
  assert(crypto.createVerify('RSA-SHA256').update(h + '.' + c).verify(publicKey, Buffer.from(s, 'base64url')), 'signature verifies');
  const claims = JSON.parse(Buffer.from(c, 'base64url')); assert.strictEqual(claims.iss, '77'); assert(claims.exp - claims.iat <= 600);
  let sent;
  const tok = await App.installationToken({ appId: 77, privateKey: pem.replace(/\n/g, '\\n'), installationId: '123', now: Date.parse(now), fetchFn: async (u, o) => { sent = { u, o }; return { status: 201, json: async () => ({ token: 'ghs_abc' }) }; } });
  assert.strictEqual(tok, 'ghs_abc'); assert(sent.u.endsWith('/app/installations/123/access_tokens'));
  assert.deepStrictEqual(JSON.parse(sent.o.body).permissions, { contents: 'write', metadata: 'read' });
  await assert.rejects(() => App.installationToken({ appId: 77, privateKey: pem, installationId: '1/../2', fetchFn: async () => ({}) }), /Bad installation id/);
  const err = await App.installationToken({ appId: 77, privateKey: pem, installationId: '5', fetchFn: async () => ({ status: 401, json: async () => ({ message: 'Bearer ' + jwt }) }) }).catch((e) => e);
  assert(!String(err.message).includes(jwt), 'the error does not echo the token');
  await assert.rejects(() => App.appJwt({ appId: 1, privateKey: ['-----BEGIN RSA ', 'PRIVATE KEY-----\nabc\n-----END RSA ', 'PRIVATE KEY-----'].join('') }), /PKCS#8/);
  console.log('✅ GitHub push tests passed!');
})().catch((e) => { console.error(e); process.exit(1); });
