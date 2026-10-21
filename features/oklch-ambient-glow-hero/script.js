(function () {
  const root = document.documentElement;
  const hero = document.getElementById('auroraHero');
  const chips = document.querySelectorAll('#presetChips .chip');

  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    root.style.setProperty('--mx', `${x.toFixed(1)}%`);
    root.style.setProperty('--my', `${y.toFixed(1)}%`);
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      root.style.setProperty('--h1', chip.getAttribute('data-h1'));
      root.style.setProperty('--h2', chip.getAttribute('data-h2'));
      root.style.setProperty('--h3', chip.getAttribute('data-h3'));
    });
  });
})();
