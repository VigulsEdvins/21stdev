/* Recommendation rules (plan E3.4): from a brief to a starting list of blocks, each with a one-line reason.
   The rules are DATA (the RULES table), not code, so they can be changed without touching the logic below.
   When the visitor says "I don't know" the result is the safe set: opening banner, about, what you offer, reviews, contact. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./questions.js') : root.EdvQuestions);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvRecommend = api;
})(typeof self !== 'undefined' ? self : this, function (Q) {
  const MIN = 5, MAX = 9, KEEP_AT = 2; // a block needs this much weight to be kept; the page is padded or trimmed to 5 to 9 blocks
  // The order blocks appear on a page, top to bottom.
  const ORDER = ['banner', 'about', 'services', 'process', 'gallery', 'prices', 'team', 'reviews', 'faq', 'newsletter', 'map', 'contact'];

  /** { when: { question id: answer value, or a list that matches any }, add: [[block, weight, reason], ...] } */
  const RULES = [
    { when: {}, add: [['banner', 3, 'so people see at once what the page is about'], ['about', 2, 'so people learn who is behind it'], ['services', 2, 'to show what you offer'], ['reviews', 1.5, 'because other people’s words build trust'], ['contact', 3, 'so people can reach you']] },
    { when: { purpose: 'business' }, add: [['services', 1, 'because it is for your business'], ['reviews', 1, 'because customers trust other customers'], ['map', 1, 'so customers can find you']] },
    { when: { purpose: 'self' }, add: [['about', 2, 'because the page is about you'], ['gallery', 2, 'to show your work']] },
    { when: { purpose: 'event' }, add: [['process', 2, 'to lay out the day, step by step'], ['map', 2.5, 'so guests know where to go'], ['faq', 1, 'to answer what guests always ask'], ['services', -2, 'an event has no list of services'], ['reviews', -2, 'an event has no reviews yet']] },
    { when: { purpose: 'product' }, add: [['services', 2, 'to list what the product does'], ['gallery', 2, 'to show the product'], ['prices', 2, 'so people see what it costs'], ['faq', 1, 'to answer the questions buyers ask'], ['about', -1, 'the product is the star, not the maker']] },
    { when: { action: ['call', 'book'] }, add: [['contact', 2, 'because you want people to call or write to you'], ['map', 1, 'so they know where you are'], ['process', 1, 'to show how booking works']] },
    { when: { action: 'book' }, add: [['prices', 2, 'because people check the cost before they book'], ['faq', 1, 'to settle doubts before they book']] },
    { when: { action: 'buy' }, add: [['prices', 3, 'because you want people to buy'], ['services', 1, 'to show what is for sale'], ['faq', 1.5, 'to answer questions before a purchase']] },
    { when: { action: 'signup' }, add: [['newsletter', 3, 'because you want people to sign up'], ['reviews', 1, 'to show others already did']] },
    { when: { action: 'read' }, add: [['about', 2, 'because you want people to read about you']] },
    { when: { action: 'see' }, add: [['gallery', 3, 'because you want people to see your work']] },
    { when: { content: 'none' }, add: [['team', -3, 'a team block needs photos you do not have yet'], ['gallery', -1, 'a gallery needs photos you do not have yet']] },
    { when: { content: 'all' }, add: [['gallery', 1, 'because you already have photos']] },
    { when: { languages: ['2', '3'] }, add: [['faq', 0.5, 'a short list of answers helps visitors in every language']] }
  ];

  const label = (id) => (Q.BLOCKS.find((b) => b[0] === id) || [id, id])[1];
  const answerOf = (brief, id) => { const a = (brief.answers || {})[id]; return a && !a.unknown ? a.value : null; };
  const matches = (rule, brief) => Object.entries(rule.when).every(([qid, want]) => {
    const v = answerOf(brief, qid);
    if (v == null || (Array.isArray(v) && !v.length)) return false;
    const have = Array.isArray(v) ? v : [v], wants = Array.isArray(want) ? want : [want];
    return wants.some((w) => have.includes(w));
  });

  /** recommend(brief) -> { blocks: [{ id, label, because }], chosen: boolean } ; blocks are in page order */
  function recommend(brief) {
    const chosen = answerOf(brief, 'blocks');
    if (Array.isArray(chosen) && chosen.length) { // the visitor already picked: respect it, in page order
      const ids = ORDER.filter((id) => chosen.includes(id));
      return { chosen: true, blocks: ids.map((id) => ({ id, label: label(id), because: 'you chose it' })) };
    }
    const score = Object.fromEntries(ORDER.map((id) => [id, { w: 0, why: [] }]));
    for (const rule of RULES) {
      if (!matches(rule, brief)) continue;
      for (const [id, weight, because] of rule.add) { score[id].w += weight; if (weight > 0) score[id].why.push({ weight, because }); }
    }
    const ranked = ORDER.map((id, i) => ({ id, i, w: score[id].w })).sort((a, b) => b.w - a.w || a.i - b.i);
    let pick = ranked.filter((r) => r.w >= KEEP_AT).slice(0, MAX);
    for (const r of ranked) { if (pick.length >= MIN) break; if (!pick.includes(r) && r.w > 0) pick.push(r); }
    const ids = ORDER.filter((id) => pick.some((p) => p.id === id));
    return { chosen: false, blocks: ids.map((id) => ({ id, label: label(id), because: score[id].why.sort((a, b) => b.weight - a.weight)[0].because })) };
  }
  return { recommend, RULES, ORDER, MIN, MAX };
});
