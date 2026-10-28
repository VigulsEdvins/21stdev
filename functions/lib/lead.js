/* Lead intake (plan E3.6, E9.1, E9.2). Pure logic: the mailer, the store and the clock are passed in, so tests need no network.
   Nothing here holds an address or a key; they come from environment settings (see docs/deploy/lead-intake.md). */
const Brief = require('../../site/js/brief.js');
const Prices = require('../../site/js/prices.js');
const Q = require('../../site/js/questions.js');

const MAX_BODY = 20000;
const PATH_LABEL = { done: 'Done for you', talk: 'Wants to talk first', self: 'Build it myself (waiting for the builder)' };
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

const normEmail = (s) => clean(s, 254).toLowerCase();
const normPhone = (s) => { const d = clean(s, 40).replace(/[^\d+]/g, ''); return d.startsWith('00') ? '+' + d.slice(2) : d; };
const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const validPhone = (s) => /^\+?\d{6,15}$/.test(s);

/** Checks the request body. Returns { ok: true, lead } or { ok: false, status, errors }. */
function parse(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, errors: ['body must be an object'] };
  const email = normEmail(body.email), phone = normPhone(body.phone);
  const rawEmail = clean(body.email, 254), rawPhone = clean(body.phone, 40);
  if (!rawEmail && !rawPhone) errors.push('Leave an email address or a phone number.');
  if (rawEmail && !validEmail(email)) errors.push('The email address does not look right.');
  if (rawPhone && !validPhone(phone)) errors.push('The phone number does not look right.');
  if (body.consent !== true) errors.push('Consent is needed so we may contact you.');
  const brief = body.brief || { v: 1, answers: {} };
  const bad = Brief.check(brief);
  if (bad.length) errors.push('The answers are not valid: ' + bad.slice(0, 3).join('; '));
  if (errors.length) return { ok: false, status: 422, errors };
  const path = ['self', 'done', 'talk'].includes(body.path) ? body.path : (brief.path || 'done');
  return { ok: true, lead: { path, email, phone, name: clean(body.name, 100), how: clean(body.how, 40), message: clean(body.message, 1000), brief,
    consent: { given: true, text: clean(body.consentText, 300), at: null } } };
}

/** One stable key per person: the email if there is one, else the phone number. */
const dedupeKey = (l) => (l.email ? 'e:' + l.email : 'p:' + l.phone);

const hasAnswersOf = (l) => Object.keys(l.brief.answers || {}).length > 0;

/** The price shown to the owner, always recomputed here from the answers and the one price table. */
function quote(brief) {
  const blocks = Q.blockCount(brief.answers), editor = Q.wantsEditor(brief.answers);
  const chosen = brief.answers.blocks;
  return { blocks, editor, guessedBlocks: !(chosen && !chosen.unknown && Array.isArray(chosen.value) && chosen.value.length),
    self: Prices.self(blocks, editor), done: Prices.done(blocks, editor) };
}

/** Email text. The contact is in the subject line; answers are grouped, and “I don’t know yet” goes under “To discuss”. */
function renderEmail(lead, repeat) {
  const hasAnswers = Object.keys(lead.brief.answers || {}).length > 0;
  const q = quote(lead.brief);
  const contact = lead.name || lead.email || lead.phone;
  const subject = clean(`${repeat ? 'Again: ' : 'New lead: '}${contact} (${lead.email || lead.phone}) · ${PATH_LABEL[lead.path] || lead.path}${hasAnswers ? ' · about ' + Prices.eur(lead.path === 'self' ? q.self : q.done) : ''}`, 200);
  const rows = Brief.readable(lead.brief);
  const part = (state) => rows.filter((r) => r.state === state);
  const line = (r) => `- ${r.question}\n  ${r.text}${r.note ? '\n  Note: ' + r.note : ''}`;
  const lines = [
    `${PATH_LABEL[lead.path] || lead.path}${repeat ? ' (this person has written before)' : ''}`, '',
    'CONTACT', lead.name ? `Name: ${lead.name}` : null, lead.email ? `Email: ${lead.email}` : null, lead.phone ? `Phone: ${lead.phone}` : null,
    lead.how ? `Prefers: ${lead.how}` : null, '',
    ...(hasAnswers ? ['PRICE', `${q.blocks} blocks${q.guessedBlocks ? ' (assumed: they did not choose)' : ''}${q.editor ? ', with the editor' : ''}`,
    `Build it themselves: ${Prices.eur(q.self)}`, `If we do it: ${Prices.eur(q.done)}`, '',
    'ANSWERED', ...part('answered').map(line), '',
    'TO DISCUSS (they said “I don’t know yet”)', ...part('unknown').map((r) => `- ${r.question}`), '',
    'SKIPPED', ...part('skipped').map((r) => `- ${r.question}`), ''] : []),
    lead.message ? 'MESSAGE\n' + lead.message + '\n' : null,
    `They agreed: “${lead.consent.text || 'It is fine to contact me about this page.'}” at ${lead.consent.at}`
  ].filter((x) => x !== null);
  return { subject, text: lines.join('\n') };
}

/**
 * handle(request, deps): request = { body, ip, honeypot }, deps = { mailer, store, now, to, from }.
 * mailer.send({ to, from, subject, text }); store.get(key) / store.put(key, value, { ttl }) are optional.
 * Returns { status, json }.
 */
async function handle(request, deps) {
  const now = (deps.now || (() => new Date()))();
  if (request.honeypot) return { status: 200, json: { ok: true } }; // a bot filled the hidden field: look successful, do nothing
  const bodySize = JSON.stringify(request.body || {}).length;
  if (bodySize > MAX_BODY) return { status: 413, json: { ok: false, errors: ['That is too large.'] } };
  if (deps.store && request.ip) { // at most 5 sends an hour from one address
    const k = 'rl:' + request.ip, n = Number(await deps.store.get(k)) || 0;
    if (n >= 5) return { status: 429, json: { ok: false, errors: ['Too many tries. Please wait an hour or write to us.'] } };
    await deps.store.put(k, String(n + 1), { ttl: 3600 });
  }
  const p = parse(request.body);
  if (!p.ok) return { status: p.status, json: { ok: false, errors: p.errors } };
  const lead = p.lead; lead.consent.at = now.toISOString();
  const key = dedupeKey(lead);
  const repeat = !!(deps.store && await deps.store.get('lead:' + key));
  const mail = renderEmail(lead, repeat);
  try { await deps.mailer.send({ to: deps.to, from: deps.from, subject: mail.subject, text: mail.text, replyTo: lead.email || undefined }); }
  catch (e) { return { status: 502, json: { ok: false, errors: ['We could not send that just now. Please try again in a minute.'] } }; }
  if (deps.store) await deps.store.put('lead:' + key, now.toISOString(), { ttl: 60 * 60 * 24 * 90 });
  // an automatic acknowledgement to the sender, only when switched on (deps.ack) and only to an email address they gave
  if (deps.ack && lead.email) {
    try { await deps.mailer.send({ to: lead.email, from: deps.from, subject: 'We have your message', text: 'Thank you. We have your message' + (hasAnswersOf(lead) ? ' and your answers' : '') + ' and will get in touch. If you did not write to us, you can ignore this email.' }); } catch (e) { /* the lead is already with the owner */ }
  }
  return { status: 200, json: { ok: true, repeat } };
}

/** A mailer for Resend (https://resend.com). The key comes from the environment. */
function resendMailer(apiKey, fetchImpl) {
  const f = fetchImpl || fetch;
  return { async send({ to, from, subject, text, replyTo }) {
    const r = await f('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, ...(replyTo ? { reply_to: replyTo } : {}) }) });
    if (!r.ok) throw new Error('mail ' + r.status);
  } };
}

module.exports = { handle, parse, quote, renderEmail, dedupeKey, resendMailer, normPhone, MAX_BODY };
