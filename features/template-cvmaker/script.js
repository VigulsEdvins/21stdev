// CV Craft Pro template showcase script
(function () {
  const cards = document.querySelectorAll('.doc-preview-card');
  cards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      cards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
})();
