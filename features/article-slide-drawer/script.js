/**
 * Slide-Over Editorial Article Reader Drawer
 * Extracted from betteroff/app.js (openArticleDrawer, closeArticleDrawer)
 */
(function () {
  const ARTICLES = [
    {
      slug: 'defective-units',
      title: 'Defective Units Vol. 1 — Tactile Industrial Synthesis',
      tag: 'SHOWCASE',
      month: "OCTOBER '26",
      grad: 'linear-gradient(135deg, #0284c7, #1e1b4b)',
      body: [
        'Designed as an exploration into imperfect hardware surfaces, Defective Units combines physical rotary encoders with real-time WebGL shaders.',
        'Every transition uses critically damped spring curves so the interface responds with mechanical weight rather than linear CSS keyframes.'
      ]
    },
    {
      slug: 'kinetic-monograph',
      title: 'Kinetic Typography & Editorial Grid Systems',
      tag: 'INSPIRE',
      month: "SEPTEMBER '26",
      grad: 'linear-gradient(135deg, #9333ea, #4c0519)',
      body: [
        'Modern web typography bridges Swiss international grids with variable font axes driven by scroll velocity and cursor proximity.',
        'By isolating layout geometry from repaint-heavy properties, 60fps editorial motion runs effortlessly across desktop and mobile viewports.'
      ]
    },
    {
      slug: 'spatial-sound-architecture',
      title: 'Procedural WebAudio Micro-Interactions',
      tag: 'ARCHIVE',
      month: "AUGUST '26",
      grad: 'linear-gradient(135deg, #10b981, #064e3b)',
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
    <article class="story-card" data-slug="${a.slug}" tabindex="0">
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
    mediaEl.style.background = art.grad;
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

  // Auto-open first article briefly on load so card preview shows the drawer
  openArticleDrawer('defective-units');
})();
