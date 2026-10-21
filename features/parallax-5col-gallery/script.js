(function () {
  const ARTISTS = [
    { name: 'Camille Vivier', role: 'Photography', palettes: [['#1e1b18', '#c89d7c'], ['#3d2b1f', '#e5c3a6'], ['#14213d', '#fca311']] },
    { name: 'Lukas Wassmann', role: 'Editorial', palettes: [['#2b2d42', '#8d99ae'], ['#1b4332', '#95d5b2'], ['#3c096c', '#e0aaff']] },
    { name: 'Sonia Sieff', role: 'Direction', palettes: [['#5f0f40', '#fb8b24'], ['#0f4c5c', '#e36414'], ['#22223b', '#c9ada7']] },
    { name: 'Harley Weir', role: 'Set Design', palettes: [['#370617', '#f48c06'], ['#03071e', '#dc2f02'], ['#1d3557', '#a8dadc']] },
    { name: 'Carlijn Jacobs', role: 'Creative', palettes: [['#6b2737', '#e08dac'], ['#2d3142', '#bfc0c0'], ['#0b132b', '#5bc0be']] },
    { name: 'quent.in Studio', role: 'Archive', palettes: [['#283618', '#dda15e'], ['#606c38', '#fefae0'], ['#003049', '#eae2b7']] },
    { name: 'Elizaveta Porodina', role: 'Motion', palettes: [['#3a0ca3', '#f72585'], ['#240046', '#ff9e00'], ['#10002b', '#c77dff']] },
    { name: 'Fumiko Imano', role: 'Collage', palettes: [['#3d405b', '#e07a5f'], ['#81b29a', '#f2cc8f'], ['#264653', '#e9c46a']] },
    { name: 'lotte van raalte', role: 'Sculpture', palettes: [['#4a4e69', '#9a8c98'], ['#22223b', '#f2e9e4'], ['#5c677d', '#33415c']] },
    { name: 'Thibaut Grevet', role: 'Film', palettes: [['#141413', '#8c7a6b'], ['#1f2421', '#9cc5a1'], ['#2f3e46', '#cad2c5']] }
  ];

  const columnsEl = document.getElementById('vivColumns');
  const panStage = document.getElementById('vivPanStage');
  if (!columnsEl || !panStage) return;

  const colSpeeds = [1.0, -0.85, 1.15, -0.95, 0.9];
  const colInitialOffsets = [0, -70, -25, -90, -40];
  const colElements = [];
  const topCardLayers = [];

  for (let c = 0; c < 5; c++) {
    const col = document.createElement('div');
    col.className = 'viv-col';
    for (let r = 0; r < 4; r++) {
      const artist = ARTISTS[(c * 2 + r) % ARTISTS.length];
      const card = document.createElement('article');
      card.className = 'viv-card';

      const media = document.createElement('div');
      media.className = 'viv-card-media';

      const layers = artist.palettes.map((pal, idx) => {
        const layer = document.createElement('div');
        layer.className = 'viv-card-layer' + (idx === 0 ? ' is-active' : '');
        layer.style.background = `radial-gradient(circle at ${30 + idx * 25}% ${25 + idx * 20}%, ${pal[1]} 0%, ${pal[0]} 75%)`;
        layer.innerHTML = `<svg viewBox="0 0 120 160" width="100%" height="100%" style="opacity:0.25"><circle cx="${45 + idx * 15}" cy="${65 + idx * 10}" r="36" fill="none" stroke="#fff" stroke-width="1"/><line x1="15" y1="${125 - idx * 15}" x2="105" y2="${40 + idx * 15}" stroke="#fff" stroke-width="0.75"/></svg>`;
        media.appendChild(layer);
        return layer;
      });

      if (r === 0) {
        const badge = document.createElement('span');
        badge.className = 'viv-cycle-badge';
        badge.textContent = '1 / 3';
        media.appendChild(badge);
        topCardLayers.push({ layers, badge, active: 0 });
      }

      const meta = document.createElement('div');
      meta.className = 'viv-card-meta';
      meta.innerHTML = `<span class="viv-artist-name">${artist.name}</span><span class="viv-artist-role">${artist.role}</span>`;

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

  window.addEventListener('mousemove', (e) => {
    const normX = (e.clientX / window.innerWidth) - 0.5;
    targetPanX = -normX * 140;
  });

  window.addEventListener('wheel', (e) => {
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
