/**
 * Portfolio Masonry Filter & Modal Controller
 * Extracted from Margarita Vigule work.html
 */
(function () {
  const pills = document.querySelectorAll('.filter-pill');
  const items = document.querySelectorAll('.masonry-item');
  const countEl = document.getElementById('itemCount');

  // Modal elements
  const modal = document.getElementById('detailModal');
  const modalClose = document.getElementById('modalClose');
  const modalImg = document.getElementById('modalImg');
  const modalCat = document.getElementById('modalCat');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalClient = document.getElementById('modalClient');
  const modalYear = document.getElementById('modalYear');

  // Filter logic
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const targetCat = pill.getAttribute('data-cat');
      let visibleCount = 0;

      items.forEach((item) => {
        const itemCat = item.getAttribute('data-cat');
        const matches = targetCat === 'all' || itemCat === targetCat;
        item.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount++;
      });

      if (countEl) {
        countEl.textContent = `Showing ${visibleCount} of ${items.length} projects`;
      }
    });
  });

  // Modal Open
  items.forEach((item) => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const cat = item.getAttribute('data-cat') || '';
      const title = item.getAttribute('data-title') || '';
      const client = item.getAttribute('data-client') || '';
      const year = item.getAttribute('data-year') || '';
      const desc = item.getAttribute('data-desc') || '';

      modalImg.src = img ? img.src : '';
      modalCat.textContent = cat.toUpperCase();
      modalTitle.textContent = title;
      modalClient.textContent = client;
      modalYear.textContent = year;
      modalDesc.textContent = desc;

      modal.classList.remove('is-hidden');
    });
  });

  // Modal Close
  modalClose.addEventListener('click', () => {
    modal.classList.add('is-hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('is-hidden');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('is-hidden')) {
      modal.classList.add('is-hidden');
    }
  });
})();
