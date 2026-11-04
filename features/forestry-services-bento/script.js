(function () {
  document.querySelectorAll('.fsb-card').forEach(card => {
    card.addEventListener('click', () => {
      const link = card.querySelector('.fsb-link');
      if (link) {
        link.style.transform = 'translateX(4px)';
        setTimeout(() => link.style.transform = 'none', 200);
      }
    });
  });
})();
