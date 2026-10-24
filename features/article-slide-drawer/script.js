/**
 * Slide-Over Editorial Article Reader Drawer
 * Extracted from betteroff/app.js (with real Lookback editorial photography)
 */
(function () {
  const ARTICLES = [
    {
      slug: 'defective-units',
      title: 'Defective Units Vol. 1 — Tactile Industrial Synthesis',
      tag: 'SHOWCASE',
      month: "OCTOBER '26",
      img: '/assets/library/defective-units-vol-1-ee41dd19.webp',
      body: [
        'Designed as an exploration into imperfect hardware surfaces, Defective Units combines physical rotary encoders with real-time WebGL shaders.',
        'Every transition uses critically damped spring curves so the interface responds with mechanical weight rather than linear CSS keyframes.'
      ]
    },
    {
      slug: 'kinetic-monograph',
      title: 'A$AP × Ray-Ban — Optical Campaign & Grid Systems',
      tag: 'INSPIRE',
      month: "SEPTEMBER '26",
      img: '/assets/library/asap-x-rayban-b0252755.webp',
      body: [
        'Modern web typography bridges Swiss international grids with variable font axes driven by scroll velocity and cursor proximity.',
        'By isolating layout geometry from repaint-heavy properties, 60fps editorial motion runs effortlessly across desktop and mobile viewports.'
      ]
    },
    {
      slug: 'spatial-sound-architecture',
      title: 'Converse × Works Studio — Footwear Drop Architecture',
      tag: 'ARCHIVE',
      month: "AUGUST '26",
      img: '/assets/library/converse-shoe-drop-by-works-studio-5e6ce881.webp',
      body: [
        'Instead of loading megabytes of external audio samples, subtle triangle and sine oscillators synthesize tactile clicks and harmonic swells on the fly.',
        'The result is a zero-latency sonic identity that reinforces every hover, drag, and drawer transition.'
      ]
    }
  ];

  const grid = document.getElementById('story-grid');
  const drawer = document.getElementById('article-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const btnClose = document.getElementById('drawer-btn-close');
  const tagEl = document.getElementById('drawer-badge-tag');
  const monthEl = document.getElementById('drawer-badge-month');
  const titleEl = document.getElementById('drawer-title');
  const mediaEl = document.getElementById('drawer-media');
  const bodyEl = document.getElementById('drawer-body');

  if (!grid || !drawer) return;

  grid.innerHTML = ARTICLES.map(
    (a) => `
    <article class="story-card" data-slug="${a.slug}" tabindex="0" style="background: linear-gradient(180deg, rgba(12,12,15,0.55), rgba(12,12,15,0.92)), url('${a.img}') center/cover no-repeat;">
      <span class="story-card__tag">${a.tag} • ${a.month}</span>
      <h3>${a.title}</h3>
      <p>Click to inspect full story in slide-over drawer →</p>
    </article>`
  ).join('');

  function openArticleDrawer(slug) {
    const art = ARTICLES.find((a) => a.slug === slug) || ARTICLES[0];
    tagEl.textContent = art.tag;
    monthEl.textContent = art.month;
    titleEl.textContent = art.title;
    mediaEl.style.background = `url('${art.img}') center/cover no-repeat`;
    bodyEl.innerHTML = art.body.map((p) => `<p>${p}</p>`).join('');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeArticleDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  grid.querySelectorAll('.story-card').forEach((card) => {
    card.addEventListener('click', () => openArticleDrawer(card.getAttribute('data-slug')));
  });

  if (backdrop) backdrop.addEventListener('click', closeArticleDrawer);
  if (btnClose) btnClose.addEventListener('click', closeArticleDrawer);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeArticleDrawer();
  });

  openArticleDrawer('defective-units');
})();
