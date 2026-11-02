(() => {
  const funding = document.querySelector('.imc-funding');
  if (!funding) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        funding.querySelectorAll('.imc-bar-fill').forEach(fill => {
          fill.style.transform = 'scaleX(1)';
        });
        observer.unobserve(funding);
      }
    });
  }, { threshold: 0.2 });

  observer.observe(funding);
})();
