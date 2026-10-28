/* Cloudflare Pages Function: POST /api/lead. All logic is in ../lib/lead.js.
   Settings (never in git): LEAD_TO_EMAIL, LEAD_FROM_EMAIL, RESEND_API_KEY; optional KV binding LEADS; optional TURNSTILE_SECRET. */
import lead from '../lib/lead.js';
const { handle, resendMailer } = lead;

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function turnstileOk(token, secret, ip) {
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token || '', remoteip: ip || '' }) });
  return r.ok && (await r.json()).success === true;
}

export async function onRequestPost({ request, env }) {
  if (!env.LEAD_TO_EMAIL || !env.LEAD_FROM_EMAIL || !env.RESEND_API_KEY) return json(503, { ok: false, errors: ['Sending is not set up yet.'] });
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json(403, { ok: false, errors: ['Not allowed.'] });
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json(415, { ok: false, errors: ['Send JSON.'] });
  const text = await request.text();
  if (text.length > 40000) return json(413, { ok: false, errors: ['That is too large.'] });
  let body; try { body = JSON.parse(text); } catch (e) { return json(400, { ok: false, errors: ['That was not valid JSON.'] }); }
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (env.TURNSTILE_SECRET && !(await turnstileOk(body && body.turnstile, env.TURNSTILE_SECRET, ip))) return json(403, { ok: false, errors: ['The spam check failed. Please try again.'] });
  const store = env.LEADS ? { get: (k) => env.LEADS.get(k), put: (k, v, o) => env.LEADS.put(k, v, { expirationTtl: Math.max(60, o.ttl) }) } : null;
  const r = await handle({ body, ip, honeypot: body && body.website }, { mailer: resendMailer(env.RESEND_API_KEY), store, to: env.LEAD_TO_EMAIL, from: env.LEAD_FROM_EMAIL, ack: env.LEAD_ACK === '1' });
  return json(r.status, r.json);
}
export const onRequest = () => json(405, { ok: false, errors: ['Use POST.'] }); // any method except POST
