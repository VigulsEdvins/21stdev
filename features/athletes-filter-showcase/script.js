/**
 * Filterable Roster & Portrait Hover Showcase
 * Extracted from carousel-gallery-play/app.js (with real athlete photography)
 */
(function () {
  const ROSTER = [
    { name: 'Kaye Furo', role: 'Club Brugge // Forward', category: 'exclusive', img: '/carousel-gallery-play/assets/images/20241106_Pieter-Slembrouck-KAYE-100.webp' },
    { name: 'Kasper Dolberg', role: 'AFC Ajax // Striker', category: 'exclusive', img: '/carousel-gallery-play/assets/images/20250328_Pieter-Slembrouck-AJAX-Dolberg-110.webp' },
    { name: 'Thibaud Verlinden', role: 'OH Leuven // Winger', category: 'all', img: '/carousel-gallery-play/assets/images/20240612_Thibaud-Verlinden-121.webp' },
    { name: 'Sebastiaan Bornauw', role: 'VfL Wolfsburg // Center Back', category: 'exclusive', img: '/carousel-gallery-play/assets/images/20250630_Pieter-Slembrouck-Sebastiaan-Bornauw-323.webp' },
    { name: 'Ignace Van Der Brempt', role: 'Como 1907 // Fullback', category: 'all', img: '/carousel-gallery-play/assets/images/20250125_Pieter-Slembrouck-COMO1907-104.webp' },
    { name: 'Tolu Arokodare', role: 'KRC Genk // Striker', category: 'exclusive', img: '/carousel-gallery-play/assets/images/20250226_Pieter-Slembrouck-Tolu-100.webp' },
    { name: 'Steven Berghuis', role: 'AFC Ajax // Creative Midfielder', category: 'creative', img: '/carousel-gallery-play/assets/images/20250728_Pieter-Slembrouck-Skechers-Steven-Berghuis-PR-Retouches-106.webp' },
    { name: 'Jerry Lawyer', role: 'Visual Director & Photographer', category: 'creative', img: '/carousel-gallery-play/assets/images/20251007_Pieter-Slembrouck-Jerry-selection-119-scaled.webp' }
  ];

  const rail = document.getElementById('athletes-rail');
  const tabs = document.querySelectorAll('.athletes-tab-btn');
  if (!rail) return;

  function render(filter) {
    const list = ROSTER.filter((item) => filter === 'all' || item.category === filter);
    rail.innerHTML = list
      .map(
        (ath) => `
      <article class="portrait-card" data-category="${ath.category}">
        <div class="portrait-card__media" style="background: linear-gradient(180deg, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.75) 100%), url('${ath.img}') center/cover no-repeat;">
          <span class="portrait-card__badge">${ath.category.toUpperCase()}</span>
          <a href="#contact" class="portrait-card__overlay" onclick="event.preventDefault()">
            <div class="portrait-card__overlay-top">
              <svg width="14" height="14" viewBox="0 0 12 12"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="#ffffff" stroke-width="1.6" fill="none"/></svg>
            </div>
            <div class="portrait-card__overlay-center">COLLABORATE ↗</div>
            <div></div>
          </a>
        </div>
        <div>
          <h3 class="portrait-card__name">${ath.name}</h3>
          <p class="portrait-card__role">${ath.role}</p>
        </div>
      </article>`
      )
      .join('');
  }

  render('all');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter') || 'all';
      tabs.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      render(filter);
    });
  });
})();
