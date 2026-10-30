/**
 * The builder's side of publishing at <name>.edvlabs.com (plan 2026-10-30-publish-subdomain.md, step 6): turns the files of the finished site into
 * a publish request, talks to /api/site-name, /api/my-sites, /api/publish and /api/unpublish, and puts every answer into plain words.
 * Pure parts (no page needed): toFiles, explain, safeAddress. The screen itself is guided-publish.js.
 */
(function () {
  'use strict';

  /** Bytes (Uint8Array or ArrayBuffer) as base64, in pieces so a large picture does not overflow the call stack. */
  function bytesToBase64(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }

  /* The kinds of file a site may contain: the same list as TYPES in functions/lib/publish.js (tests/test-publish-client.js fails if they drift apart).
     The download also holds files that help a person who hosts the site themselves (README, DEPLOY guide, host settings). They do not belong on a live site. */
  const ALLOWED = ['html', 'css', 'js', 'json', 'svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'ico', 'woff2', 'txt', 'xml', 'webmanifest'];
  const NOT_LIVE = ['DEPLOY.html'];
  const wanted = (path) => { const base = path.slice(path.lastIndexOf('/') + 1), dot = base.lastIndexOf('.'); return dot > 0 && ALLOWED.includes(base.slice(dot + 1).toLowerCase()) && !NOT_LIVE.includes(base) && !path.split('/').some((s) => s.startsWith('.')); };

  /** { files: {name: text}, assets: {name: bytes} } from the export, as the list /api/publish takes. Text stays text; pictures and fonts become base64.
      Files that only help someone who hosts the download themselves are left out. */
  function toFiles(collected) {
    const list = [];
    for (const [path, text] of Object.entries(collected.files || {})) if (wanted(path)) list.push({ path, content: String(text) });
    for (const [path, data] of Object.entries(collected.assets || {})) {
      if (!wanted(path)) continue;
      if (typeof data === 'string') list.push({ path, content: data });
      else list.push({ path, content: bytesToBase64(data), encoding: 'base64' });
    }
    return list;
  }

  /** What to tell the person about an answer: { kind, message }. kind is one of ok, signin, payment, taken, name, files, busy, error. */
  function explain(status, json) {
    const first = json && Array.isArray(json.errors) && json.errors[0] ? String(json.errors[0]) : '';
    if (status === 200 && json && json.ok) return { kind: 'ok', message: '' };
    if (status === 401) return { kind: 'signin', message: 'Please sign in again to put your page online.' };
    if (status === 402) return { kind: 'payment', message: first || 'Publishing on an edvlabs address is a paid extra.' };
    if (status === 409 && json && json.reason === 'taken') return { kind: 'taken', message: 'This name is taken. Please choose another.' };
    if (status === 409) return { kind: 'error', message: first || 'That did not work. Please try again.' };
    if (status === 400 && json && json.reason === 'files') return { kind: 'files', message: 'Your page cannot be put online yet: ' + first };
    if (status === 400) return { kind: 'name', message: first || 'Please check the name.' };
    if (status === 403) return { kind: 'error', message: first || 'This is not allowed.' };
    if (status === 413) return { kind: 'files', message: 'Your page is too large to put online. Try smaller pictures.' };
    if (status === 429) return { kind: 'busy', message: 'You have published a lot in the last hour. Please try again a little later.' };
    if (status === 503) return { kind: 'error', message: 'Putting pages online is not switched on yet.' };
    return { kind: 'error', message: 'That did not work just now. Please try again.' };
  }

  /** The address of a published site, only if it is a plain https address (it is used as a link). Otherwise ''. */
  function safeAddress(value) {
    const v = String(value || '');
    return /^https:\/\/[a-z0-9-]{3,30}\.[a-z0-9.-]+\/$/.test(v) ? v : '';
  }

  /** The five calls. `token()` gives the access token; `fetchImpl` is fetch (replaced in tests). Each returns { status, json }. */
  function createClient({ fetchImpl, token, base }) {
    const f = fetchImpl || ((...a) => fetch(...a)), root = base || '/api';
    async function call(method, path, body) {
      const t = await token();
      if (!t) return { status: 401, json: { ok: false, errors: ['Please sign in.'] } };
      let r;
      try {
        r = await f(root + path, { method, headers: Object.assign({ Authorization: 'Bearer ' + t }, body === undefined ? {} : { 'Content-Type': 'application/json' }), body: body === undefined ? undefined : JSON.stringify(body) });
      } catch (e) { return { status: 0, json: { ok: false, errors: ['No connection.'] } }; }
      let json = null; try { json = await r.json(); } catch (e) { json = null; }
      return { status: r.status, json };
    }
    return {
      checkName: (name) => call('GET', '/site-name?name=' + encodeURIComponent(name)),
      mySites: () => call('GET', '/my-sites'),
      publish: (name, collected, projectId) => call('POST', '/publish', Object.assign({ name, files: toFiles(collected) }, projectId ? { projectId } : {})),
      unpublish: (siteId) => call('POST', '/unpublish', { siteId })
    };
  }

  const api = { bytesToBase64, toFiles, explain, safeAddress, createClient, ALLOWED, wanted };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderPublishClient = api;
})();
