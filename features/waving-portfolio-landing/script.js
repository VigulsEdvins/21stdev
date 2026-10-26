(function () {
  // The hand follows the pointer a little: it leans toward the cursor while the page is hovered.
  var hand = document.querySelector('.pw-arm');
  if (!hand || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var page = document.querySelector('.pw-page'), cur = 0, goal = 0, raf = 0;
  function step() { cur += (goal - cur) * 0.12; hand.style.transform = 'rotate(' + cur.toFixed(2) + 'deg)'; raf = Math.abs(goal - cur) > 0.05 ? requestAnimationFrame(step) : 0; }
  page.addEventListener('pointermove', function (e) {
    var r = hand.getBoundingClientRect(), mid = r.left + r.width / 2;
    goal = Math.max(-14, Math.min(14, (e.clientX - mid) / 40));
    if (!raf) raf = requestAnimationFrame(step);
  });
  page.addEventListener('pointerleave', function () { goal = 0; if (!raf) raf = requestAnimationFrame(step); });
})();
