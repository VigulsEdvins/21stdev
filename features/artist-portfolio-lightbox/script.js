(function () {
  const PLATES = [
    {
      title: 'Plate I — Chromatic Study, Northport',
      img: '/assets/library/edv-art-01.svg'
    },
    {
      title: 'Plate II — Desert Light Editorial, Eastvale',
      img: '/assets/library/edv-art-05.svg'
    },
    {
      title: 'Plate III — Studio Portrait Series, Lakeside',
      img: '/assets/library/edv-art-09.svg'
    },
    {
      title: 'Plate IV — Stable Yard Editorial, Harbourside',
      img: '/assets/library/edv-art-13.svg'
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
