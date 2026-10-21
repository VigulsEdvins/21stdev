(function () {
  const ITEMS = [
    { title: 'Camille Vivier for Miu Miu Autumn Monograph', tag: 'Campaign', date: 'Oct 2026', height: 240, c1: '#231942', c2: '#be95c4' },
    { title: 'Palais de Tokyo: Shadow & Silver Gelatin Retrospective', tag: 'Exhibition', date: 'Oct 2026', height: 170, c1: '#1b4332', c2: '#74c69d' },
    { title: 'Vogue Italia September Issue by Carlijn Jacobs', tag: 'Cover', date: 'Sep 2026', height: 280, c1: '#641220', c2: '#e07a5f' },
    { title: 'Lukas Wassmann: Alpine Brutalism Series', tag: 'Exhibition', date: 'Sep 2026', height: 190, c1: '#003049', c2: '#669bbc' },
    { title: 'Hermès Silk & Motion Directed by Thibaut Grevet', tag: 'Campaign', date: 'Aug 2026', height: 250, c1: '#7f4f24', c2: '#ddb892' },
    { title: 'Dazed & Confused Winter Feature: Elizaveta Porodina', tag: 'Cover', date: 'Aug 2026', height: 200, c1: '#240046', c2: '#9d4edd' }
  ];

  const grid = document.getElementById('masonryGrid');
  const filterBtns = document.querySelectorAll('#masonryFilters .filter-chip');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
      }
    });
  }, { threshold: 0.1 });

  function render(filterTag) {
    grid.innerHTML = '';
    const filtered = filterTag === 'all' ? ITEMS : ITEMS.filter((i) => i.tag === filterTag);
    filtered.forEach((item, idx) => {
      const card = document.createElement('article');
      card.className = 'masonry-card';
      card.style.transitionDelay = `${idx * 65}ms`;
      card.innerHTML = `
        <div class="card-visual" style="height:${item.height}px;background:linear-gradient(135deg, ${item.c1}, ${item.c2});"></div>
        <div class="card-body">
          <span class="card-tag">${item.tag}</span>
          <h2 class="card-title">${item.title}</h2>
          <span class="card-date">${item.date}</span>
        </div>
      `;
      grid.appendChild(card);
      observer.observe(card);
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      render(btn.getAttribute('data-tag'));
    });
  });

  render('all');
})();
