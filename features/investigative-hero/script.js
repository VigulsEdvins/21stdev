(() => {
  const hero = document.getElementById('investigative-hero');
  if (!hero) return;

  const clear = hero.querySelector('.inv-hero-clear');
  const rim = hero.querySelector('.inv-hero-rim');
  const tr = hero.querySelector('.inv-bracket--tr');
  const bl = hero.querySelector('.inv-bracket--bl');

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const padX = 15 + Math.abs(xRatio - 0.5) * 15;
    const padY = 20 + Math.abs(yRatio - 0.5) * 16;

    if (clear) clear.style.clipPath = `inset(${padY}% ${padX}% ${padY}% ${padX}% round 16px)`;
    if (rim) {
      rim.style.top = `${padY}%`;
      rim.style.bottom = `${padY}%`;
      rim.style.left = `${padX}%`;
      rim.style.right = `${padX}%`;
    }
  });

  hero.addEventListener('mouseleave', () => {
    if (clear) clear.style.clipPath = '';
    if (rim) {
      rim.style.top = '';
      rim.style.bottom = '';
      rim.style.left = '';
      rim.style.right = '';
    }
  });
})();
