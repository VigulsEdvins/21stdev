/**
 * Before / After Resume Transformation Slider Controller
 * Controls clip-path and handle position via mouse / touch dragging.
 */
(function () {
  const container = document.getElementById('sliderContainer');
  const afterSide = document.getElementById('afterSide');
  const handle = document.getElementById('sliderHandle');

  let isDragging = false;

  function updatePosition(clientX) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    let pct = (x / rect.width) * 100;
    pct = Math.max(5, Math.min(95, pct));

    afterSide.style.clipPath = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
    handle.style.left = `${pct}%`;
  }

  // Pointer / Mouse Events
  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    updatePosition(e.clientX);
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  });

  function stopDrag(e) {
    if (isDragging) {
      isDragging = false;
      try { container.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }

  container.addEventListener('pointerup', stopDrag);
  container.addEventListener('pointercancel', stopDrag);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const currentLeft = parseFloat(handle.style.left || '50');
    if (e.key === 'ArrowLeft') {
      const next = Math.max(5, currentLeft - 5);
      afterSide.style.clipPath = `polygon(${next}% 0, 100% 0, 100% 100%, ${next}% 100%)`;
      handle.style.left = `${next}%`;
    } else if (e.key === 'ArrowRight') {
      const next = Math.min(95, currentLeft + 5);
      afterSide.style.clipPath = `polygon(${next}% 0, 100% 0, 100% 100%, ${next}% 100%)`;
      handle.style.left = `${next}%`;
    }
  });
})();
