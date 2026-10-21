/**
 * Infinite Dual-Direction Partner Logo Marquee
 * Extracted from carousel-gallery-play/app.js
 */
(function () {
  const ROW_1 = [
    { name: 'AFC AJAX', color: '#ef4444' },
    { name: 'CLUB BRUGGE', color: '#3b82f6' },
    { name: 'COMO 1907', color: '#0ea5e9' },
    { name: 'DAZN BROADCAST', color: '#eab308' },
    { name: 'HOKA PERFORMANCE', color: '#38bdf8' },
    { name: 'ADIDAS ORIGINALS', color: '#10b981' },
    { name: 'BELGIAN RED DEVILS', color: '#f97316' }
  ];

  const ROW_2 = [
    { name: 'ROYAL ANTWERP FC', color: '#f43f5e' },
    { name: 'DPG MEDIA', color: '#a855f7' },
    { name: 'BNXT LEAGUE', color: '#6366f1' },
    { name: 'VFL WOLFSBURG', color: '#22c55e' },
    { name: 'AL QADSIAH FC', color: '#f59e0b' },
    { name: 'PLAY SPORTS', color: '#14b8a6' },
    { name: 'JOUER STUDIO', color: '#ec4899' }
  ];

  function populateRow(elId, items) {
    const container = document.getElementById(elId);
    if (!container) return;
    const renderGroup = (isClone) => `
      <div class="clients-marquee__group"${isClone ? ' aria-hidden="true"' : ''}>
        ${items
          .map(
            (c) => `
          <div class="clients-marquee__item">
            <span class="clients-marquee__dot" style="background:${c.color}"></span>
            <span>${c.name}</span>
          </div>`
          )
          .join('')}
      </div>`;
    container.innerHTML = renderGroup(false) + renderGroup(true);
  }

  populateRow('marquee-row-1', ROW_1);
  populateRow('marquee-row-2', ROW_2);

  const btn = document.getElementById('speed-toggle');
  let fast = false;
  if (btn) {
    btn.addEventListener('click', () => {
      fast = !fast;
      document.documentElement.style.setProperty('--marquee-duration', fast ? '12s' : '26s');
      btn.textContent = fast ? 'Speed: Turbo (2.2x)' : 'Speed: Normal (1x)';
    });
  }
})();
