(() => {
  const section = document.getElementById('weekly-schedule');
  if (!section) return;

  const filterButtons = section.querySelectorAll('.hws-filter-btn');
  const cards = section.querySelectorAll('.hws-card');

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.category;
      cards.forEach((card) => {
        const cardCat = card.dataset.category;
        if (cat === 'all' || cardCat === cat) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
})();
