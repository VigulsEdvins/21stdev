(function () {
  const ITEMS = [
    {
      title: 'Arturo Torres for Autumn Editorial Monograph',
      tag: 'Campaign',
      date: 'Oct 2026',
      height: 220,
      img: '/vivmgmt/assets/images/1778793995-arturo-torres-fashion-photography-advertising-photographer-15.jpg'
    },
    {
      title: 'Danielle Moore: Desert Couture Retrospective',
      tag: 'Exhibition',
      date: 'Oct 2026',
      height: 175,
      img: '/vivmgmt/assets/images/1778184121-danielle-moore-desert-couture-fashion-editorial.jpg'
    },
    {
      title: 'Zac Posen Studio Denim Portrait Series',
      tag: 'Cover',
      date: 'Sep 2026',
      height: 245,
      img: '/vivmgmt/assets/images/1778184120-gap-studio-zac-posen-denim-portrait.jpg'
    },
    {
      title: 'Quinn Gravier: Portrait Study Archive',
      tag: 'Exhibition',
      date: 'Sep 2026',
      height: 190,
      img: '/vivmgmt/assets/images/1778795293-quinn-gravier-advertising-photographer-portraits-celebrity26.jpg'
    },
    {
      title: 'Cera Hensley Sculptural Still Life Commission',
      tag: 'Campaign',
      date: 'Aug 2026',
      height: 230,
      img: '/vivmgmt/assets/images/1777466641-cera-hensley-beauty-photography-stilllife-cosmetics-21.jpg'
    },
    {
      title: 'Barragan Stables Architectural Fashion Feature',
      tag: 'Cover',
      date: 'Aug 2026',
      height: 200,
      img: '/vivmgmt/assets/images/1778184121-fashion-editorial-horse-barragan-stables-mexico.jpg'
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
