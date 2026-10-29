/* A pretend GitHub for tests (plan E7.6): the few Git Data / Contents endpoints the push uses, in memory, with the same
   status codes the real API gives (409 for an empty repo, 404 for a missing ref, 422 for a non-fast-forward). It also
   records every request so tests can check what was sent. */
const crypto = require('crypto');
const sha1 = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + buf.length + '\0'), buf])).digest('hex');
const rid = (s) => crypto.createHash('sha1').update(s + Math.random()).digest('hex');

function create() {
  const repos = new Map(); // 'o/r' -> { archived, blobs:Map sha->Buffer, trees:Map sha->[{path,sha}], commits:Map sha->{tree,parents,message}, refs:Map name->sha }
  const log = [];
  const state = { token: 'ghs_faketoken', revoked: false };
  const addRepo = (full, files, branch = 'main') => {
    const r = { archived: false, blobs: new Map(), trees: new Map(), commits: new Map(), refs: new Map() };
    repos.set(full, r);
    if (files) {
      const entries = Object.entries(files).map(([p, c]) => { const b = Buffer.from(c); const s = sha1(b); r.blobs.set(s, b); return { path: p, sha: s }; });
      const t = rid('tree'); r.trees.set(t, entries);
      const c = rid('commit'); r.commits.set(c, { tree: t, parents: [], message: 'initial' }); r.refs.set(branch, c);
    }
    return r;
  };
  const filesAt = (full, branch = 'main') => { const r = repos.get(full); const c = r.commits.get(r.refs.get(branch)); return Object.fromEntries(r.trees.get(c.tree).map((e) => [e.path, r.blobs.get(e.sha)])); };

  function gh(token) {
    return async (method, path, body) => {
      log.push({ method, path, body, token });
      const out = (status, json) => ({ status, json });
      if (token !== state.token || state.revoked) return out(401, { message: 'Bad credentials' });
      const [p, q] = path.split('?');
      const m = p.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
      if (!m) return out(404, {});
      const full = m[1] + '/' + m[2], rest = m[3] || '', r = repos.get(full);
      if (!r) return out(404, { message: 'Not Found' });
      if (rest === '') return out(200, { full_name: full, archived: r.archived });
      let mm;
      if (rest.startsWith('/commits')) return r.refs.size ? out(200, [{ sha: [...r.refs.values()][0] }]) : out(409, { message: 'Git Repository is empty.' });
      if ((mm = rest.match(/^\/git\/ref\/heads\/(.+)$/))) return r.refs.has(mm[1]) ? out(200, { object: { sha: r.refs.get(mm[1]) } }) : out(r.refs.size ? 404 : 409, { message: 'Not Found' });
      if ((mm = rest.match(/^\/git\/commits\/(.+)$/)) && method === 'GET') { const c = r.commits.get(mm[1]); return c ? out(200, { sha: mm[1], tree: { sha: c.tree } }) : out(404, {}); }
      if ((mm = rest.match(/^\/git\/trees\/(.+)$/)) && method === 'GET') { const t = r.trees.get(mm[1]); return t ? out(200, { truncated: false, tree: t.map((e) => ({ path: e.path, type: 'blob', sha: e.sha })) }) : out(404, {}); }
      if (rest === '/git/blobs') { if (!r.refs.size) return out(409, { message: 'Git Repository is empty.' }); const b = Buffer.from(body.content, 'base64'); const s = sha1(b); r.blobs.set(s, b); return out(201, { sha: s }); }
      if (rest === '/git/trees') {
        const base = r.trees.get(body.base_tree); if (!base) return out(422, {});
        const map = new Map(base.map((e) => [e.path, e.sha]));
        for (const it of body.tree) { if (!r.blobs.has(it.sha)) return out(422, { message: 'tree.sha missing' }); map.set(it.path, it.sha); } // no deletions are possible: sha:null is not supported here
        const t = rid('tree'); r.trees.set(t, [...map].map(([path, sha]) => ({ path, sha }))); return out(201, { sha: t });
      }
      if (rest === '/git/commits') { const c = rid('commit'); r.commits.set(c, { tree: body.tree, parents: body.parents, message: body.message }); return out(201, { sha: c }); }
      if ((mm = rest.match(/^\/git\/refs\/heads\/(.+)$/)) && method === 'PATCH') {
        const cur = r.refs.get(mm[1]); if (!cur) return out(404, {});
        const nc = r.commits.get(body.sha); if (!nc || !nc.parents.includes(cur)) return out(body.force ? 200 : 422, {}); // only fast-forwards without force
        r.refs.set(mm[1], body.sha); return out(200, { object: { sha: body.sha } });
      }
      if ((mm = rest.match(/^\/contents\/(.+)$/)) && method === 'PUT') {
        const b = Buffer.from(body.content, 'base64'), s = sha1(b); r.blobs.set(s, b);
        const t = rid('tree'); r.trees.set(t, [{ path: mm[1], sha: s }]);
        const c = rid('commit'); r.commits.set(c, { tree: t, parents: [], message: body.message }); r.refs.set(body.branch || 'main', c);
        return out(201, { commit: { sha: c } });
      }
      return out(404, { message: 'unhandled ' + method + ' ' + rest });
    };
  }
  return { repos, addRepo, filesAt, gh, log, state, sha1, commitCount: (full) => repos.get(full).commits.size };
}
module.exports = { create, sha1 };
