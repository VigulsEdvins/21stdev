(function () {
  const PLATES = [
    { title: 'Plate I — Chromatic Silhouette, Paris', bg: 'radial-gradient(circle at 35% 30%, #f72585, #240046 75%)' },
    { title: 'Plate II — Sculpted Minimalist Forms, Milan', bg: 'radial-gradient(circle at 65% 35%, #fca311, #14213d 75%)' },
    { title: 'Plate III — Surrealist Portrait Study, Tokyo', bg: 'radial-gradient(circle at 40% 60%, #4cc9f0, #10002b 75%)' },
    { title: 'Plate IV — Nocturnal Architecture, Antwerp', bg: 'radial-gradient(circle at 50% 35%, #e07a5f, #2b2d42 75%)' }
  ];

  const grid = document.getElementById('plateGrid');
  const modal = document.getElementById('lightboxModal');
  const canvas = document.getElementById('lightboxCanvas');
  const counter = document.getElementById('lightboxCounter');
  const caption = document.getElementById('lightboxCaption');
  const thumbs = document.getElementById('lightboxThumbs');

  let activeIdx = 0;

  PLATES.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'plate-thumb';
    card.style.background = p.bg;
    card.innerHTML = `<span style="font-size:12px;font-weight:500">${p.title}</span>`;
    card.addEventListener('click', () => {
      setPlate(idx);
      modal.classList.add('is-open');
    });
    grid.appendChild(card);

    const mini = document.createElement('button');
    mini.className = 'mini-thumb';
    mini.style.background = p.bg;
    mini.addEventListener('click', () => setPlate(idx));
    thumbs.appendChild(mini);
  });

  function setPlate(idx) {
    activeIdx = (idx + PLATES.length) % PLATES.length;
    const p = PLATES[activeIdx];
    canvas.style.background = p.bg;
    counter.textContent = `PLATE 0${activeIdx + 1} / 0${PLATES.length}`;
    caption.textContent = p.title;
    Array.from(thumbs.children).forEach((el, i) => {
      el.classList.toggle('is-active', i === activeIdx);
    });
  }

  document.getElementById('prevPlate').addEventListener('click', () => setPlate(activeIdx - 1));
  document.getElementById('nextPlate').addEventListener('click', () => setPlate(activeIdx + 1));
  document.getElementById('lightboxClose').addEventListener('click', () => modal.classList.remove('is-open'));

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') setPlate(activeIdx + 1);
    if (e.key === 'ArrowLeft') setPlate(activeIdx - 1);
    if (e.key === 'Escape') modal.classList.remove('is-open');
  });

  setPlate(0);
})();
