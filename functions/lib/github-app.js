/* GitHub App access (plan E7.6). The app's private key lives only in environment settings (GITHUB_APP_PRIVATE_KEY, GITHUB_APP_ID);
   it signs a 9-minute token (JWT, RS256) that is traded for an installation token which lasts an hour and is held only in memory
   for one request. Nothing here writes a token to a log, a database or a result. Works in Cloudflare Workers and Node (Web Crypto). */
const API = 'https://api.github.com';

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const text64 = (s) => b64url(new TextEncoder().encode(s));

async function importKey(pem) {
  const body = String(pem).replace(/\\n/g, '\n').replace(/-----(BEGIN|END)[A-Z ]+-----/g, '').replace(/\s+/g, '');
  if (/RSA PRIVATE KEY/.test(String(pem))) throw new Error('The GitHub App key must be in PKCS#8 form (BEGIN PRIVATE KEY). Convert it with: openssl pkcs8 -topk8 -nocrypt -in key.pem');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

/** The app's own token, valid 9 minutes, backdated 30 seconds for clock drift. */
async function appJwt({ appId, privateKey, now = Date.now() }) {
  const iat = Math.floor(now / 1000) - 30;
  const head = text64(JSON.stringify({ alg: 'RS256', typ: 'JWT' })), claims = text64(JSON.stringify({ iat, exp: iat + 9 * 60 - 0, iss: String(appId) }));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await importKey(privateKey), new TextEncoder().encode(head + '.' + claims));
  return head + '.' + claims + '.' + b64url(sig);
}

/** An installation token for one install. Asks for only Contents write, whatever else the app may hold. */
async function installationToken({ appId, privateKey, installationId, fetchFn = fetch, now }) {
  if (!/^\d{1,20}$/.test(String(installationId))) throw new Error('Bad installation id');
  const jwt = await appJwt({ appId, privateKey, now });
  const r = await fetchFn(API + '/app/installations/' + installationId + '/access_tokens', {
    method: 'POST', headers: { authorization: 'Bearer ' + jwt, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'edvlabs', 'content-type': 'application/json' },
    body: JSON.stringify({ permissions: { contents: 'write', metadata: 'read' } })
  });
  if (r.status !== 201) { const e = new Error('Could not get an installation token'); e.status = r.status; throw e; } // the body is not copied: it may echo headers
  return (await r.json()).token;
}

/** The `gh` function push() wants, bound to one token. */
function client(token, fetchFn = fetch) {
  return async (method, path, body) => {
    const r = await fetchFn(API + path, { method, headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'edvlabs', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    let json = null; try { json = await r.json(); } catch (_) { /* some answers have no body */ }
    return { status: r.status, json };
  };
}

module.exports = { appJwt, installationToken, client, importKey };
