(() => {
  const container = document.getElementById('dossier-archive');
  if (!container) return;

  const filters = container.querySelectorAll('.dar-filter');
  const rows = container.querySelectorAll('.dar-row');

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const selected = btn.dataset.filter || 'all';

      filters.forEach(f => f.classList.remove('is-active'));
      btn.classList.add('is-active');

      rows.forEach(row => {
        const topic = row.dataset.topic;
        if (selected === 'all' || topic === selected) {
          row.classList.remove('is-hidden');
        } else {
          row.classList.add('is-hidden');
        }
      });
    });
  });
})();
