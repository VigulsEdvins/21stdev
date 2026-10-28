/* brief_v1: the one document the questions produce (plan E3.2). The browser and the server use this same checker.
   { v: 1, path: 'self'|'done'|'talk', answers: { <question id>: { value, unknown, note? } } }
   A skipped question may be missing, or have an empty value with unknown false. "I don't know yet" is unknown: true. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./questions.js') : root.EdvQuestions);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvBrief = api;
})(typeof self !== 'undefined' ? self : this, function (Q) {
  const PATHS = ['self', 'done', 'talk'];
  const MAX_TEXT = 200, MAX_NOTE = 500;
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const empty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

  /** Returns a list of problems; an empty list means the brief is valid. */
  function check(brief) {
    const errs = [];
    if (!isObj(brief)) return ['the brief must be an object'];
    const extra = Object.keys(brief).filter((k) => !['v', 'path', 'answers', 'pending', 'sent'].includes(k));
    if (extra.length) errs.push('unknown field: ' + extra.join(', '));
    if (brief.v !== 1) errs.push('v must be 1');
    if (brief.path != null && !PATHS.includes(brief.path)) errs.push('path must be one of ' + PATHS.join(', '));
    if (!isObj(brief.answers)) { errs.push('answers must be an object'); return errs; }
    const byId = Object.fromEntries(Q.QUESTIONS.map((q) => [q.id, q]));
    for (const [id, a] of Object.entries(brief.answers)) {
      const q = byId[id];
      if (!q) { errs.push(id + ': not a question'); continue; }
      if (!isObj(a)) { errs.push(id + ': answer must be an object'); continue; }
      if (Object.keys(a).some((k) => !['value', 'unknown', 'note'].includes(k))) errs.push(id + ': unknown field in answer');
      if (typeof a.unknown !== 'boolean') errs.push(id + ': unknown must be true or false');
      if (a.note != null && (typeof a.note !== 'string' || a.note.length > MAX_NOTE)) errs.push(id + ': note must be text of at most ' + MAX_NOTE + ' characters');
      if (a.unknown === true && !empty(a.value)) { errs.push(id + ': marked “I don’t know yet” but also has a value'); continue; }
      if (empty(a.value)) continue;
      const allowed = (q.options || []).map((o) => o[0]);
      if (q.type === 'text') {
        if (typeof a.value !== 'string' || a.value.length > MAX_TEXT) errs.push(id + ': must be text of at most ' + MAX_TEXT + ' characters');
      } else if (q.type === 'one') {
        if (typeof a.value !== 'string' || !allowed.includes(a.value)) errs.push(id + ': not an allowed choice');
      } else if (q.type === 'many') {
        if (!Array.isArray(a.value) || a.value.some((v) => !allowed.includes(v)) || new Set(a.value).size !== a.value.length) errs.push(id + ': not a list of allowed choices');
        else if (q.max && a.value.length > q.max) errs.push(id + ': at most ' + q.max + ' choices');
      }
    }
    return errs;
  }
  /** The labels a person reads: { question, text, state: 'answered' | 'unknown' | 'skipped' } for every question, in order. */
  function readable(brief) {
    return Q.QUESTIONS.map((q) => {
      const a = (brief.answers || {})[q.id];
      const label = (v) => (q.options.find((o) => o[0] === v) || [0, v])[1];
      if (a && a.unknown) return { id: q.id, question: q.title, text: 'I don’t know yet', state: 'unknown', note: a.note || '' };
      if (!a || empty(a.value)) return { id: q.id, question: q.title, text: 'Skipped', state: 'skipped', note: (a && a.note) || '' };
      const text = q.type === 'text' ? a.value : (Array.isArray(a.value) ? a.value.map(label).join(', ') : label(a.value));
      return { id: q.id, question: q.title, text, state: 'answered', note: a.note || '' };
    });
  }
  /** A JSON Schema (draft 2020-12) of the same rules, for tools outside this code. Written to docs/schema/brief_v1.schema.json. */
  function jsonSchema() {
    const answer = (q) => {
      const value = q.type === 'text' ? { type: ['string', 'null'], maxLength: MAX_TEXT }
        : q.type === 'one' ? { enum: [...q.options.map((o) => o[0]), null, ''] }
        : { type: ['array', 'null'], items: { enum: q.options.map((o) => o[0]) }, uniqueItems: true, ...(q.max ? { maxItems: q.max } : {}) };
      return { type: 'object', additionalProperties: false, required: ['unknown'], properties: { value, unknown: { type: 'boolean' }, note: { type: 'string', maxLength: MAX_NOTE } } };
    };
    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'edvlabs brief_v1', type: 'object', additionalProperties: false, required: ['v', 'answers'],
      properties: { v: { const: 1 }, path: { enum: PATHS }, pending: { type: 'boolean' }, sent: { type: 'boolean' },
        answers: { type: 'object', additionalProperties: false, properties: Object.fromEntries(Q.QUESTIONS.map((q) => [q.id, answer(q)])) } },
      description: 'Also checked by site/js/brief.js: when unknown is true the value must be empty.'
    };
  }
  return { check, readable, jsonSchema, PATHS, MAX_TEXT, MAX_NOTE };
});
