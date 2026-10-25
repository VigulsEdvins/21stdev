(function () {
  const PLATES = [
    {
      title: 'Plate I — Arturo Torres Chromatic Study, Paris',
      img: '/assets/library/1778793995-arturo-torres-fashion-photography-advertising-photographer-15-ba930551.jpg'
    },
    {
      title: 'Plate II — Danielle Moore Desert Couture, Milan',
      img: '/assets/library/1778184121-danielle-moore-desert-couture-fashion-editorial-ead1d087.jpg'
    },
    {
      title: 'Plate III — Zac Posen Studio Denim Portrait, NY',
      img: '/assets/library/1778184120-gap-studio-zac-posen-denim-portrait-ea9bd030.jpg'
    },
    {
      title: 'Plate IV — Barragan Stables Editorial, Mexico City',
      img: '/assets/library/1778184121-fashion-editorial-horse-barragan-stables-mexico-d62757c7.jpg'
    }
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
    card.style.background = `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.75)), url('${p.img}') center/cover no-repeat`;
    card.innerHTML = `<span style="font-size:12px;font-weight:500">${p.title}</span>`;
    card.addEventListener('click', () => {
      setPlate(idx);
      modal.classList.add('is-open');
    });
    grid.appendChild(card);

    const mini = document.createElement('button');
    mini.className = 'mini-thumb';
    mini.setAttribute('aria-label', 'Show image ' + (idx + 1));
    mini.style.background = `url('${p.img}') center/cover no-repeat`;
    mini.addEventListener('click', () => setPlate(idx));
    thumbs.appendChild(mini);
  });

  function setPlate(idx) {
    activeIdx = (idx + PLATES.length) % PLATES.length;
    const p = PLATES[activeIdx];
    canvas.style.background = `url('${p.img}') center/contain no-repeat #0b0b0c`;
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
