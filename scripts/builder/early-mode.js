/**
 * Runs first, before the page is drawn (plan E6.12): puts `is-guided` on <body> when the guided path will be used, the same rule as
 * guided.js, so the first paint already has the guided layout. Without it the header was drawn tall, then shrank when guided.js ran
 * (a jump of 40 to 80 px on a phone). guided.js still owns the mode afterwards.
 */
(function () {
  'use strict';
  var mode = 'guided';
  try {
    var q = new URLSearchParams(window.location.search);
    if (q.get('advanced') === '1') mode = 'advanced';
    else if (q.get('guided') !== '1' && window.localStorage.getItem('web_builder_mode') === 'advanced') mode = 'advanced';
  } catch (e) { /* storage blocked: guided is the default */ }
  if (mode === 'guided' && document.body) { document.body.classList.add('is-guided'); document.body.setAttribute('data-step', '1'); } // step 1 is where every visit starts; guided.js keeps the step after this
})();
