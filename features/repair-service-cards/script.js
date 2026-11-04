function initRepairServiceCards(root = document) {
  const wrap = root.querySelector('.rep-wrap');
  if (!wrap) return;

  wrap.querySelectorAll('.rep-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.closest('.rep-card')?.querySelector('.rep-service-name')?.textContent || 'Service';
      btn.textContent = 'Requested ✓';
      setTimeout(() => { btn.textContent = 'Book Service →'; }, 1500);
    });
  });
}

if (typeof window !== 'undefined') {
  initRepairServiceCards();
}
