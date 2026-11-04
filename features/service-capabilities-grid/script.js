// Interactive service cards hover subtle tilt
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.scg-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.15s ease, border-color 0.15s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.3s ease, border-color 0.3s ease';
    });
  });
});
