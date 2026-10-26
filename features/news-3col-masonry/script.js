(function () {
  const ITEMS = [
    {
      title: 'Client 01 Campaign Autumn Monograph',
      tag: 'Campaign',
      date: 'Oct 2026',
      height: 220,
      img: '/assets/library/edv-art-02.svg'
    },
    {
      title: 'Desert Light: A Retrospective',
      tag: 'Exhibition',
      date: 'Oct 2026',
      height: 175,
      img: '/assets/library/edv-art-06.svg'
    },
    {
      title: 'Studio Denim Portrait Series',
      tag: 'Cover',
      date: 'Sep 2026',
      height: 245,
      img: '/assets/library/edv-art-10.svg'
    },
    {
      title: 'Portrait Study Archive 03',
      tag: 'Exhibition',
      date: 'Sep 2026',
      height: 190,
      img: '/assets/library/edv-art-14.svg'
    },
    {
      title: 'Sculptural Still Life Commission',
      tag: 'Campaign',
      date: 'Aug 2026',
      height: 230,
      img: '/assets/library/edv-art-03.svg'
    },
    {
      title: 'Stable Yard Architectural Feature',
      tag: 'Cover',
      date: 'Aug 2026',
      height: 200,
      img: '/assets/library/edv-art-11.svg'
    }
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
        <div class="card-visual" style="height:${item.height}px;background:url('${item.img}') center/cover no-repeat;"></div>
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
