/**
 * First-run tour: three short steps (add a section, edit text, export) in a small card that never traps focus.
 * Shown once per browser (localStorage, with a fallback when storage is blocked). It stays out of the way of
 * automated browsers unless the address has ?tour=1, so tests and scripts do not have to click it away.
 */
(function () {
  'use strict';

  const KEY = 'web_builder_tour_done_v1';
  const STEPS = [
    { target: '#tabElementsBtn', title: '1. Add a section', text: 'Open Elements, search or filter the vault and click a card to add it to your page. Hover a thumbnail for a live preview.' },
    { target: '#tabContentBtn', title: '2. Edit the words and pictures', text: 'The Content tab lists the headlines, text, images and links of the selected section. Edits show in the preview straight away.' },
    { target: '#openExportModalBtn', title: '3. Export', text: 'Download a ZIP (or one HTML file). The export window first lists anything worth fixing, like missing picture descriptions.' }
  ];

  function done() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return true; }
  }
  function markDone() {
    try { localStorage.setItem(KEY, '1'); } catch (_) { /* tour may show again next time */ }
  }

  function start(doc = document) {
    const forced = /[?&]tour=1\b/.test((doc.defaultView && doc.defaultView.location.search) || '');
    if (!forced && (done() || (typeof navigator !== 'undefined' && navigator.webdriver))) return null;
    let i = 0;
    const card = doc.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Quick tour');
    card.innerHTML = '<div class="tour-step"></div><h3 class="tour-title"></h3><p class="tour-text"></p><div class="tour-actions"><button type="button" class="builder-btn-subtle tour-skip">Skip tour</button><button type="button" class="builder-btn-primary tour-next"></button></div>';
    doc.body.appendChild(card);
    let lit = null;
    function show() {
      const s = STEPS[i];
      card.querySelector('.tour-step').textContent = `Step ${i + 1} of ${STEPS.length}`;
      card.querySelector('.tour-title').textContent = s.title;
      card.querySelector('.tour-text').textContent = s.text;
      card.querySelector('.tour-next').textContent = i === STEPS.length - 1 ? 'Got it' : 'Next';
      if (lit) lit.classList.remove('tour-highlight');
      lit = doc.querySelector(s.target);
      if (lit) lit.classList.add('tour-highlight');
    }
    function close() {
      if (lit) lit.classList.remove('tour-highlight');
      card.remove();
      markDone();
    }
    card.querySelector('.tour-next').addEventListener('click', () => { if (i < STEPS.length - 1) { i++; show(); } else close(); });
    card.querySelector('.tour-skip').addEventListener('click', close);
    doc.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape' && card.isConnected && !doc.querySelector('.is-open')) { close(); doc.removeEventListener('keydown', onKey); } });
    show();
    return { card, close };
  }

  const api = { start, KEY, STEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderTour = api;
})();
