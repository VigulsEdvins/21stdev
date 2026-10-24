(function () {
  const ARTISTS = [
    {
      name: 'Arturo Torres',
      role: 'Fashion & Motion',
      images: [
        '/vivmgmt/assets/images/1778793995-arturo-torres-fashion-photography-advertising-photographer-15.jpg',
        '/vivmgmt/assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports88.jpg',
        '/vivmgmt/assets/images/1779142866-arturo-torres-advertising-photographer-lifestyle-fashion-sports30.jpg'
      ]
    },
    {
      name: 'Danielle Moore',
      role: 'Editorial',
      images: [
        '/vivmgmt/assets/images/1778184121-danielle-moore-desert-couture-fashion-editorial.jpg',
        '/vivmgmt/assets/images/1778184121-danielle-moore-tidal-magazine-black-and-white-fashion-portrait.jpg',
        '/vivmgmt/assets/images/1773702313-danielle-moore-arturo-torres-summer-25-quay19.jpg'
      ]
    },
    {
      name: 'Quinn Gravier',
      role: 'Portraiture',
      images: [
        '/vivmgmt/assets/images/1778795293-quinn-gravier-advertising-photographer-portraits-celebrity26.jpg',
        '/vivmgmt/assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity36.jpg',
        '/vivmgmt/assets/images/1778795294-quinn-gravier-advertising-photographer-portraits-celebrity47.jpg'
      ]
    },
    {
      name: 'Cera Hensley',
      role: 'Still Life',
      images: [
        '/vivmgmt/assets/images/1777466641-cera-hensley-beauty-photography-stilllife-cosmetics-21.jpg',
        '/vivmgmt/assets/images/1777465200-cera-hensley-food-photography-beverage-stilllife-16.jpg',
        '/vivmgmt/assets/images/1778275287-kinship-makeup-sunscreen-stilllife-photoshoot-production-6.jpg'
      ]
    },
    {
      name: 'Zac Posen Studio',
      role: 'Campaign',
      images: [
        '/vivmgmt/assets/images/1778184120-gap-studio-zac-posen-denim-portrait.jpg',
        '/vivmgmt/assets/images/1778184121-fashion-editorial-horse-barragan-stables-mexico.jpg',
        '/vivmgmt/assets/images/1778772904-danielle-moore-phils-skincare-mens-beauty-portrait.jpg'
      ]
    },
    {
      name: 'Byrum Archive',
      role: 'Sport & Studio',
      images: [
        '/vivmgmt/assets/images/1774484653-byrum-20200305-nike-basketball-studio-0416.jpg',
        '/vivmgmt/assets/images/1774484687-221112_nike-hydrostrong_5316.jpg',
        '/vivmgmt/assets/images/1774484866-byrum-191105-adidas-victor-702.jpg'
      ]
    },
    {
      name: 'Harper Christian',
      role: 'Monograph',
      images: [
        '/vivmgmt/assets/images/1774485213-160609-harper-christian-1484-3.jpg',
        '/vivmgmt/assets/images/1777465143-20180623_foam_test_585.jpg',
        '/vivmgmt/assets/images/1778793996-arturo-torres-fashion-photography-advertising-photographer-25.jpg'
      ]
    }
  ];

  const columnsEl = document.getElementById('vivColumns');
  const panStage = document.getElementById('vivPanStage');
  if (!columnsEl || !panStage) return;

  const colSpeeds = [1.0, -0.85, 1.15, -0.95, 0.9];
  const colInitialOffsets = [0, -55, -20, -70, -30];
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

      const layers = artist.images.map((imgSrc, idx) => {
        const layer = document.createElement('div');
        layer.className = 'viv-card-layer' + (idx === 0 ? ' is-active' : '');
        layer.style.backgroundImage = `url('${imgSrc}')`;
        layer.style.backgroundSize = 'cover';
        layer.style.backgroundPosition = 'center';
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

  const vivGallery = panStage.closest('.viv-gallery') || panStage;
  vivGallery.addEventListener('mousemove', (e) => {
    const rect = vivGallery.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / (rect.width || window.innerWidth)) - 0.5;
    targetPanX = -normX * 140;
  });

  vivGallery.addEventListener('wheel', (e) => {
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
