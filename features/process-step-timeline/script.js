// Process step timeline interactions
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.pst-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'rgba(200, 248, 169, 0.4)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
    });
  });
});
