/* Send the paid site to the customer's GitHub (plan E7.6). Pure logic over an injected `gh(method, path, body)` that returns
   { status, json }: the real one calls api.github.com with a short-lived installation token, the tests use tests/lib/fake-github.js.

   Guarantees:
   - the files go in as ONE commit through the Git Data API (blobs, tree, commit, ref update)
   - never a force push; the new tree is built on top of the current one, so nothing already in the repo is removed
   - a file that already exists with different content is a clash: nothing is written until the caller says overwrite is fine
   - identical files are not a clash and not rewritten, so the repo ends up byte for byte equal to the ZIP
   - an empty repo (which the Git Data API refuses) gets its first file through the Contents API, then the rest in one commit
   - a removed install, a deleted repo or a missing branch gives a plain `status`, never a thrown error */
const MAX_FILES = 400;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 90 * 1024 * 1024;

const enc = new TextEncoder();
const bytesOf = (c) => (typeof c === 'string' ? enc.encode(c) : c instanceof Uint8Array ? c : new Uint8Array(c));
function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

/** The id Git gives a file: SHA-1 of "blob <length>\0" followed by the bytes. */
async function blobSha(bytes) {
  const head = enc.encode('blob ' + bytes.length + '\0');
  const all = new Uint8Array(head.length + bytes.length);
  all.set(head); all.set(bytes, head.length);
  return hex(await crypto.subtle.digest('SHA-1', all));
}

/** A path that is safe to write: relative, no `..`, no `.git`, no backslashes or control characters. */
function safePath(p) {
  if (typeof p !== 'string' || !p || p.length > 300 || /[\\\u0000-\u001f]/.test(p) || p.startsWith('/')) return false;
  return p.split('/').every((seg) => seg && seg !== '.' && seg !== '..' && seg.toLowerCase() !== '.git');
}
const safeFolder = (f) => { const t = String(f || '').replace(/^\/+|\/+$/g, ''); return t === '' ? '' : (safePath(t) ? t : null); };
const nameOk = (s) => typeof s === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(s) && s !== '.' && s !== '..';
const branchOk = (s) => typeof s === 'string' && /^[A-Za-z0-9._\/-]{1,100}$/.test(s) && !s.includes('..') && !s.startsWith('/') && !s.endsWith('/') && !s.endsWith('.lock');

/** Checks the file set before anything is sent: limits, safe paths, and the files every download must hold. */
function checkFiles(files) {
  const names = Object.keys(files || {});
  if (!names.length) return 'No files to send.';
  if (names.length > MAX_FILES) return 'Too many files.';
  let total = 0;
  for (const n of names) {
    if (!safePath(n)) return 'A file name is not allowed: ' + JSON.stringify(n.slice(0, 60));
    const len = bytesOf(files[n]).length;
    if (len > MAX_FILE_BYTES) return 'A file is too big: ' + n;
    total += len;
  }
  if (total > MAX_TOTAL_BYTES) return 'The files are too big together.';
  for (const must of ['index.html', 'DEPLOY.md', '404.html']) if (!names.includes(must)) return 'The download is missing ' + must + '.';
  return null;
}

const fail = (status, message, extra) => Object.assign({ ok: false, status, message }, extra);
const gone = (r) => (r.status === 401 || r.status === 403 ? fail('access-revoked', 'edvlabs can no longer reach your GitHub. Install the app again, then try again.') : r.status === 404 ? fail('repo-missing', 'That repository was not found. It may have been deleted or the app cannot see it.') : null);

/**
 * target: { owner, repo, branch = 'main', folder = '' }; opts: { overwrite = false, message }.
 * Resolves { ok:true, status:'pushed'|'unchanged', commit, written:[names], url }, or { ok:false, status, message }:
 * 'invalid', 'access-revoked', 'repo-missing', 'branch-missing', 'clash' (with `clashes` = names; nothing written), 'github-error'.
 */
async function push(gh, target, files, opts = {}) {
  const bad = checkFiles(files);
  if (bad) return fail('invalid', bad);
  const { owner, repo } = target || {};
  const branch = (target && target.branch) || 'main';
  const folder = safeFolder(target && target.folder);
  if (!nameOk(owner) || !nameOk(repo) || !branchOk(branch) || folder === null) return fail('invalid', 'The repository, branch or folder name is not valid.');
  const base = '/repos/' + owner + '/' + repo;
  const path = (n) => (folder ? folder + '/' : '') + n;

  const info = await gh('GET', base);
  if (info.status !== 200) return gone(info) || fail('github-error', 'GitHub did not answer as expected.');
  if (info.json && info.json.archived) return fail('repo-missing', 'That repository is archived, so nothing can be added to it.');

  const entries = Object.entries(files).map(([n, c]) => ({ name: n, path: path(n), bytes: bytesOf(c) }));
  for (const e of entries) e.sha = await blobSha(e.bytes);
  const message = String(opts.message || 'Add my edvlabs site').slice(0, 200);

  let ref = await gh('GET', base + '/git/ref/heads/' + branch);
  let emptyRepo = false;
  if (ref.status === 404 || ref.status === 409) {
    const any = await gh('GET', base + '/commits?per_page=1');
    emptyRepo = any.status === 409 || (any.status === 200 && Array.isArray(any.json) && any.json.length === 0);
    if (!emptyRepo) return fail('branch-missing', 'The branch "' + branch + '" does not exist in that repository.');
    // the Git Data API refuses an empty repository: the first file goes in through the Contents API, as the first commit
    const first = entries[0];
    const put = await gh('PUT', base + '/contents/' + first.path, { message, content: b64(first.bytes), branch });
    if (put.status !== 201 && put.status !== 200) return gone(put) || fail('github-error', 'GitHub would not accept the first file.');
    ref = await gh('GET', base + '/git/ref/heads/' + branch);
  }
  if (ref.status !== 200) return gone(ref) || fail('github-error', 'GitHub did not answer as expected.');
  const headSha = ref.json.object.sha;
  const head = await gh('GET', base + '/git/commits/' + headSha);
  if (head.status !== 200) return gone(head) || fail('github-error', 'GitHub did not answer as expected.');
  const treeSha = head.json.tree.sha;

  const tree = await gh('GET', base + '/git/trees/' + treeSha + '?recursive=1');
  if (tree.status !== 200 || tree.json.truncated) return fail('github-error', 'The repository is too large to check safely.');
  const have = new Map(tree.json.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));

  const changed = entries.filter((e) => have.get(e.path) !== e.sha);
  const clashes = changed.filter((e) => have.has(e.path)).map((e) => e.path);
  if (clashes.length && !opts.overwrite) return fail('clash', clashes.length + ' file' + (clashes.length === 1 ? ' is' : 's are') + ' already in the repository with different content.', { clashes });
  if (!changed.length) return { ok: true, status: 'unchanged', commit: headSha, written: [], url: 'https://github.com/' + owner + '/' + repo + '/tree/' + branch };

  const items = [];
  for (const e of changed) {
    const blob = await gh('POST', base + '/git/blobs', { content: b64(e.bytes), encoding: 'base64' });
    if (blob.status !== 201) return gone(blob) || fail('github-error', 'GitHub would not accept a file.');
    items.push({ path: e.path, mode: '100644', type: 'blob', sha: blob.json.sha });
  }
  const newTree = await gh('POST', base + '/git/trees', { base_tree: treeSha, tree: items });
  if (newTree.status !== 201) return gone(newTree) || fail('github-error', 'GitHub would not accept the files.');
  const commit = await gh('POST', base + '/git/commits', { message, tree: newTree.json.sha, parents: [headSha] });
  if (commit.status !== 201) return gone(commit) || fail('github-error', 'GitHub would not accept the commit.');
  const upd = await gh('PATCH', base + '/git/refs/heads/' + branch, { sha: commit.json.sha, force: false });
  if (upd.status !== 200) return upd.status === 422 ? fail('github-error', 'The branch changed while sending. Nothing was lost; try again.') : (gone(upd) || fail('github-error', 'GitHub would not move the branch.'));
  return { ok: true, status: 'pushed', commit: commit.json.sha, written: changed.map((e) => e.name), url: 'https://github.com/' + owner + '/' + repo + '/tree/' + branch + (folder ? '/' + folder : '') };
}

module.exports = { push, checkFiles, blobSha, safePath, bytesOf, b64, MAX_FILES };
