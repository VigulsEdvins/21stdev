(function () {
  const ARTISTS = [
    {
      name: 'Artist 01',
      role: 'Fashion & Motion',
      images: [
        '/assets/library/edv-art-01.svg',
        '/assets/library/edv-art-06.svg',
        '/assets/library/edv-art-11.svg'
      ]
    },
    {
      name: 'Artist 02',
      role: 'Editorial',
      images: [
        '/assets/library/edv-art-02.svg',
        '/assets/library/edv-art-07.svg',
        '/assets/library/edv-art-12.svg'
      ]
    },
    {
      name: 'Artist 03',
      role: 'Portraiture',
      images: [
        '/assets/library/edv-art-03.svg',
        '/assets/library/edv-art-08.svg',
        '/assets/library/edv-art-13.svg'
      ]
    },
    {
      name: 'Artist 04',
      role: 'Still Life',
      images: [
        '/assets/library/edv-art-04.svg',
        '/assets/library/edv-art-09.svg',
        '/assets/library/edv-art-14.svg'
      ]
    },
    {
      name: 'Artist 05',
      role: 'Campaign',
      images: [
        '/assets/library/edv-art-05.svg',
        '/assets/library/edv-art-10.svg',
        '/assets/library/edv-art-15.svg'
      ]
    },
    {
      name: 'Artist 06',
      role: 'Sport & Studio',
      images: [
        '/assets/library/edv-art-06.svg',
        '/assets/library/edv-art-11.svg',
        '/assets/library/edv-art-16.svg'
      ]
    },
    {
      name: 'Artist 07',
      role: 'Monograph',
      images: [
        '/assets/library/edv-art-07.svg',
        '/assets/library/edv-art-12.svg',
        '/assets/library/edv-art-01.svg'
      ]
    },
    {
      name: 'Artist 08',
      role: 'Documentary',
      images: [
        '/assets/library/edv-art-08.svg',
        '/assets/library/edv-art-13.svg',
        '/assets/library/edv-art-02.svg'
      ]
    },
    {
      name: 'Artist 09',
      role: 'Fashion & Motion',
      images: [
        '/assets/library/edv-art-09.svg',
        '/assets/library/edv-art-14.svg',
        '/assets/library/edv-art-03.svg'
      ]
    },
    {
      name: 'Artist 10',
      role: 'Editorial',
      images: [
        '/assets/library/edv-art-10.svg',
        '/assets/library/edv-art-15.svg',
        '/assets/library/edv-art-04.svg'
      ]
    }
  ];

  const columnsEl = document.getElementById('edvColumns');
  const panStage = document.getElementById('edvPanStage');
  if (!columnsEl || !panStage) return;

  const colSpeeds = [1.0, -0.85, 1.15, -0.95, 0.9];
  const colInitialOffsets = [0, -55, -20, -70, -30];
  const colElements = [];
  const topCardLayers = [];

  for (let c = 0; c < 5; c++) {
    const col = document.createElement('div');
    col.className = 'edv-col';
    for (let r = 0; r < 4; r++) {
      const artist = ARTISTS[(c * 2 + r) % ARTISTS.length];
      const card = document.createElement('article');
      card.className = 'edv-card';

      const media = document.createElement('div');
      media.className = 'edv-card-media';

      const layers = artist.images.map((imgSrc, idx) => {
        const layer = document.createElement('div');
        layer.className = 'edv-card-layer' + (idx === 0 ? ' is-active' : '');
        layer.style.backgroundImage = `url('${imgSrc}')`;
        layer.style.backgroundSize = 'cover';
        layer.style.backgroundPosition = 'center';
        media.appendChild(layer);
        return layer;
      });

      if (r === 0) {
        const badge = document.createElement('span');
        badge.className = 'edv-cycle-badge';
        badge.textContent = '1 / 3';
        media.appendChild(badge);
        topCardLayers.push({ layers, badge, active: 0 });
      }

      const meta = document.createElement('div');
      meta.className = 'edv-card-meta';
      meta.innerHTML = `<span class="edv-artist-name">${artist.name}</span><span class="edv-artist-role">${artist.role}</span>`;

      card.appendChild(media);
      card.appendChild(meta);
      col.appendChild(card);
    }
    columnsEl.appendChild(col);
    colElements.push(col);
  }

  let targetPanX = 0;
  let currentPanX = 0;
  let targetScrollY = 0;
  let currentScrollY = 0;

  const edvGallery = panStage.closest('.edv-gallery') || panStage;
  edvGallery.addEventListener('mousemove', (e) => {
    const rect = edvGallery.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / (rect.width || window.innerWidth)) - 0.5;
    targetPanX = -normX * 140;
  });

  edvGallery.addEventListener('wheel', (e) => {
    targetScrollY = Math.max(-360, Math.min(360, targetScrollY + e.deltaY * 0.45));
  }, { passive: true });

  let cycleIndex = 0;
  setInterval(() => {
    const item = topCardLayers[cycleIndex % topCardLayers.length];
    if (item) {
      item.layers[item.active].classList.remove('is-active');
      item.active = (item.active + 1) % item.layers.length;
      item.layers[item.active].classList.add('is-active');
      item.badge.textContent = `${item.active + 1} / ${item.layers.length}`;
      cycleIndex++;
    }
  }, 1900);

  function tick() {
    currentPanX += (targetPanX - currentPanX) * 0.08;
    currentScrollY += (targetScrollY - currentScrollY) * 0.08;
    panStage.style.transform = `translate3d(${currentPanX.toFixed(2)}px, 0, 0)`;

    colElements.forEach((col, i) => {
      const y = colInitialOffsets[i] + currentScrollY * colSpeeds[i] * 0.55;
      col.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
