/**
 * First-run tour: short steps in a small card that never traps focus. In the guided builder (the usual one) it walks the five steps of the bar (blocks, words, look,
 * check, get it); in the advanced layout it points at the classic tabs (add a section, edit text, export).
 * Shown once per browser (localStorage, with a fallback when storage is blocked). It stays out of the way of
 * automated browsers unless the address has ?tour=1, so tests and scripts do not have to click it away.
 */
(function () {
  'use strict';

  const KEY = 'web_builder_tour_done_v1';
  const CLASSIC_STEPS = [
    { target: '#tabElementsBtn', title: '1. Add a section', text: 'Open Elements, search or filter the vault and click a card to add it to your page. Hover a thumbnail for a live preview.' },
    { target: '#tabContentBtn', title: '2. Edit the words and pictures', text: 'The Content tab lists the headlines, text, images and links of the selected section. Edits show in the preview straight away.' },
    { target: '#guidedCheckoutBtn', title: '3. Get your page', text: 'Press Get your page to see the price, pay and download your finished page. The list there shows anything worth fixing first.' }
  ];
  const GUIDED_STEPS = [
    { target: '#guidedStep-blocks', title: '1. Pick your blocks', text: 'Choose the blocks your page needs, like the opening banner, the prices or a contact form. Press Add, use the arrows to put them in order, and Another look for a different style.' },
    { target: '#guidedStep-words', title: '2. Write your words', text: 'The text on your page is sample text for now. Click a block in the preview, then type your own words and add your photos.' },
    { target: '#guidedStep-look', title: '3. Choose the look', text: 'Pick a set of colours, a pair of fonts and how round the corners are. The preview changes straight away.' },
    { target: '#guidedStep-check', title: '4. Check', text: 'This list shows in plain words what is still missing. You do not have to fix everything.' },
    { target: '#guidedStep-get', title: '5. Get it', text: 'See the price and take your finished page, or press Ask edvlabs to do it for you.' }
  ];
  const STEPS = CLASSIC_STEPS; // kept for callers that read it; start() picks the list that fits the layout

  function done() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return true; }
  }
  function markDone() {
    try { localStorage.setItem(KEY, '1'); } catch (_) { /* tour may show again next time */ }
  }

  function start(doc = document) {
    const forced = /[?&]tour=1\b/.test((doc.defaultView && doc.defaultView.location.search) || '');
    if (!forced && (done() || (typeof navigator !== 'undefined' && navigator.webdriver))) return null;
    const steps = doc.body.classList.contains('is-guided') ? GUIDED_STEPS : CLASSIC_STEPS;
    let i = 0;
    const card = doc.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Quick tour');
    card.innerHTML = '<div class="tour-step"></div><h3 class="tour-title"></h3><p class="tour-text"></p><div class="tour-actions"><button type="button" class="builder-btn-subtle tour-skip">Skip tour</button><button type="button" class="builder-btn-primary tour-next"></button></div>';
    doc.body.appendChild(card);
    let lit = null;
    function show() {
      const s = steps[i];
      card.querySelector('.tour-step').textContent = `Step ${i + 1} of ${steps.length}`;
      card.querySelector('.tour-title').textContent = s.title;
      card.querySelector('.tour-text').textContent = s.text;
      card.querySelector('.tour-next').textContent = i === steps.length - 1 ? 'Got it' : 'Next';
      if (lit) lit.classList.remove('tour-highlight');
      lit = doc.querySelector(s.target);
      if (lit) lit.classList.add('tour-highlight');
    }
    function close() {
      if (lit) lit.classList.remove('tour-highlight');
      card.remove();
      markDone();
    }
    card.querySelector('.tour-next').addEventListener('click', () => { if (i < steps.length - 1) { i++; show(); } else close(); });
    card.querySelector('.tour-skip').addEventListener('click', close);
    doc.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape' && card.isConnected && !doc.querySelector('.is-open')) { close(); doc.removeEventListener('keydown', onKey); } });
    show();
    return { card, close };
  }

  const api = { start, KEY, STEPS, CLASSIC_STEPS, GUIDED_STEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderTour = api;
})();
