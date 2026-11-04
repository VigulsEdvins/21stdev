export function initArchivalProductGrid(root = document) {
  const wrap = root.querySelector('.arch-grid-wrap');
  if (!wrap) return;

  const filterBtns = wrap.querySelectorAll('.arch-filter-btn');
  const cards = wrap.querySelectorAll('.arch-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.archFilter;
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      cards.forEach(card => {
        const cat = card.dataset.category;
        if (filter === 'all' || cat === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  wrap.querySelectorAll('.arch-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('.arch-card')?.querySelector('.arch-card__name')?.textContent || 'Piece';
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = 'Add to Bag'; }, 1500);
    });
  });
}

if (typeof window !== 'undefined') {
  initArchivalProductGrid();
}
