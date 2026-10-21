/**
 * Editorial 3x3 Interactive Hover Grid Controller
 * Spawns scattered preview image stages and updates the center headline.
 */
(function () {
  const centerTitle = document.getElementById('centerTitle');
  const hoverBadge = document.getElementById('hoverBadge');
  const hoverStage = document.getElementById('hoverStage');
  const cells = document.querySelectorAll('.grid-cell:not(.center-neutral)');

  const DEFAULT_TITLE = 'Margarita Vigule';
  const DEFAULT_BADGE = 'PHOTOGRAPHY ARCHIVE • 2026';

  const POSITIONS = [
    { top: '10%', left: '8%', width: '180px', height: '120px', rot: '-5deg', delay: 0 },
    { top: '15%', right: '10%', width: '220px', height: '150px', rot: '4deg', delay: 40 },
    { bottom: '12%', left: '12%', width: '200px', height: '140px', rot: '3deg', delay: 80 }
  ];

  let currentTimeout = null;

  cells.forEach((cell) => {
    cell.addEventListener('mouseenter', () => {
      clearTimeout(currentTimeout);
      const title = cell.getAttribute('data-title') || DEFAULT_TITLE;
      const tag = cell.getAttribute('data-tag') || 'PROJECT ARCHIVE';
      const images = (cell.getAttribute('data-images') || '').split(',').map((s) => s.trim()).filter(Boolean);

      centerTitle.textContent = title;
      hoverBadge.textContent = tag;

      // Populate stage
      hoverStage.innerHTML = '';
      images.slice(0, 3).forEach((src, idx) => {
        const pos = POSITIONS[idx % POSITIONS.length];
        const card = document.createElement('div');
        card.className = 'stage-img-card';
        card.style.top = pos.top || 'auto';
        card.style.left = pos.left || 'auto';
        card.style.right = pos.right || 'auto';
        card.style.bottom = pos.bottom || 'auto';
        card.style.width = pos.width;
        card.style.height = pos.height;
        card.style.setProperty('--rot', pos.rot);

        const img = document.createElement('img');
        img.src = src;
        img.alt = title;
        card.appendChild(img);
        hoverStage.appendChild(card);

        setTimeout(() => {
          card.classList.add('is-visible');
        }, pos.delay);
      });
    });

    cell.addEventListener('mouseleave', () => {
      currentTimeout = setTimeout(() => {
        centerTitle.textContent = DEFAULT_TITLE;
        hoverBadge.textContent = DEFAULT_BADGE;
        const cards = hoverStage.querySelectorAll('.stage-img-card');
        cards.forEach((c) => c.classList.remove('is-visible'));
        setTimeout(() => {
          hoverStage.innerHTML = '';
        }, 300);
      }, 100);
    });

    cell.addEventListener('click', () => {
      const url = cell.getAttribute('data-url');
      if (url) window.open(url, '_blank', 'noopener');
    });
  });
})();
