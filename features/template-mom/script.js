// Margarita Vigule template showcase script
(function () {
  const tiles = document.querySelectorAll('.preview-tile');
  tiles.forEach((tile) => {
    tile.addEventListener('mouseenter', () => {
      tiles.forEach((t) => t.classList.remove('active'));
      tile.classList.add('active');
    });
  });
})();
