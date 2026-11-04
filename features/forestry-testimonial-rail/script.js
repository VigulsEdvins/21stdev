export default function() {
  const slides = document.querySelectorAll('.ftr-slide');
  const prevBtn = document.querySelector('.ftr-btn-prev');
  const nextBtn = document.querySelector('.ftr-btn-next');
  let current = 0;

  function update(index) {
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    current = index;
  }

  if (prevBtn && nextBtn && slides.length > 0) {
    prevBtn.addEventListener('click', () => {
      update((current - 1 + slides.length) % slides.length);
    });
    nextBtn.addEventListener('click', () => {
      update((current + 1) % slides.length);
    });
  }
}
