// Verified review carousel logic
document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.vrc-card');
  const dots = document.querySelectorAll('.vrc-dot');
  const prevBtn = document.getElementById('vrc-prev');
  const nextBtn = document.getElementById('vrc-next');

  if (!cards.length) return;
  let current = 0;

  function show(index) {
    if (index < 0) index = cards.length - 1;
    if (index >= cards.length) index = 0;
    current = index;

    cards.forEach((card, i) => {
      if (i === current) {
        card.classList.remove('hidden');
        card.classList.add('active');
      } else {
        card.classList.add('hidden');
        card.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === current) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  prevBtn?.addEventListener('click', () => show(current - 1));
  nextBtn?.addEventListener('click', () => show(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
});
