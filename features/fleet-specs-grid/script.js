function initFleetSpecsGrid(root = document) {
  const items = root.querySelectorAll('.fleet-grid-item');
  items.forEach(it => {
    it.addEventListener('mouseenter', () => {
      it.style.borderColor = 'var(--coral)';
    });
    it.addEventListener('mouseleave', () => {
      it.style.borderColor = 'rgba(225, 196, 156, 0.3)';
    });
  });
}

if (typeof window !== 'undefined') {
  initFleetSpecsGrid();
}
