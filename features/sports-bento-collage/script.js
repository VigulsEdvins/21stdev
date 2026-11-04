(() => {
  const tiles = document.querySelectorAll('.sbc-tile');
  tiles.forEach((tile) => {
    tile.addEventListener('pointerenter', () => {
      tile.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    });
  });
})();
