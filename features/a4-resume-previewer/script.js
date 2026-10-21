/**
 * A4 Resume Previewer & Zoom Controller
 * Scales sheet using CSS transform and manages page-break guides.
 */
(function () {
  const sheet = document.getElementById('a4Sheet');
  const zoomVal = document.getElementById('zoomVal');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const toggleBreakBtn = document.getElementById('toggleBreakBtn');
  const pageBreakGuide = document.getElementById('pageBreakGuide');
  const printBtn = document.getElementById('printBtn');

  let currentZoom = 0.85;
  let showBreak = true;

  function applyZoom(z) {
    currentZoom = Math.min(1.4, Math.max(0.4, z));
    sheet.style.transform = `scale(${currentZoom})`;
    zoomVal.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  zoomInBtn.addEventListener('click', () => applyZoom(currentZoom + 0.1));
  zoomOutBtn.addEventListener('click', () => applyZoom(currentZoom - 0.1));

  toggleBreakBtn.addEventListener('click', () => {
    showBreak = !showBreak;
    pageBreakGuide.classList.toggle('is-hidden', !showBreak);
    toggleBreakBtn.textContent = `Page Break: ${showBreak ? 'ON' : 'OFF'}`;
  });

  printBtn.addEventListener('click', () => {
    window.print();
  });

  applyZoom(currentZoom);
})();
