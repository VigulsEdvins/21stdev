/**
 * Filterable Roster & Portrait Hover Showcase
 * Extracted from carousel-gallery-play/app.js (with real athlete photography)
 */
(function () {
  const ROSTER = [
    { name: 'Kaye Furo', role: 'Club Brugge // Forward', category: 'exclusive', img: '/assets/library/20241106_Pieter-Slembrouck-KAYE-100-b2f7226f.webp' },
    { name: 'Kasper Dolberg', role: 'AFC Ajax // Striker', category: 'exclusive', img: '/assets/library/20250328_Pieter-Slembrouck-AJAX-Dolberg-110-4d291839.webp' },
    { name: 'Thibaud Verlinden', role: 'OH Leuven // Winger', category: 'all', img: '/assets/library/20240612_Thibaud-Verlinden-121-3c436bd0.webp' },
    { name: 'Sebastiaan Bornauw', role: 'VfL Wolfsburg // Center Back', category: 'exclusive', img: '/assets/library/20250630_Pieter-Slembrouck-Sebastiaan-Bornauw-323-64ad2d52.webp' },
    { name: 'Ignace Van Der Brempt', role: 'Como 1907 // Fullback', category: 'all', img: '/assets/library/20250125_Pieter-Slembrouck-COMO1907-104-ff37252c.webp' },
    { name: 'Tolu Arokodare', role: 'KRC Genk // Striker', category: 'exclusive', img: '/assets/library/20250226_Pieter-Slembrouck-Tolu-100-096ae4f0.webp' },
    { name: 'Steven Berghuis', role: 'AFC Ajax // Creative Midfielder', category: 'creative', img: '/assets/library/20250728_Pieter-Slembrouck-Skechers-Steven-Berghuis-PR-Retouches-106-8afed694.webp' },
    { name: 'Jerry Lawyer', role: 'Visual Director & Photographer', category: 'creative', img: '/assets/library/20251007_Pieter-Slembrouck-Jerry-selection-119-scaled-84c4ed8e.webp' }
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
