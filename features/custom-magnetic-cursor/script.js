/**
 * Custom Glassmorphic & Magnetic Target Cursor
 * Extracted & enhanced from carousel-gallery-play/app.js (initCustomCursor)
 */
(function () {
  const cursor = document.getElementById('custom-cursor');
  const labelEl = document.getElementById('cursor-label');
  const zones = document.querySelectorAll('[data-cursor-zone]');
  const magBtns = document.querySelectorAll('[data-magnetic]');

  if (!cursor) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let curX = mouseX;
  let curY = mouseY;

  window.addEventListener(
    'pointermove',
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    },
    { passive: true }
  );

  zones.forEach((zone) => {
    zone.addEventListener('pointerenter', () => {
      if (labelEl) labelEl.textContent = zone.getAttribute('data-cursor-zone') || 'VIEW';
      cursor.classList.add('is-active');
    });
    zone.addEventListener('pointerleave', () => {
      cursor.classList.remove('is-active');
    });
  });

  magBtns.forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate3d(${(dx * 0.32).toFixed(1)}px, ${(dy * 0.32).toFixed(1)}px, 0)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = 'translate3d(0, 0, 0)';
    });
  });

  function render() {
    requestAnimationFrame(render);
    curX += (mouseX - curX) * 0.18;
    curY += (mouseY - curY) * 0.18;
    cursor.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0)`;
  }

  requestAnimationFrame(render);
})();
