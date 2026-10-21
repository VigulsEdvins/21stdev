/**
 * Filterable Roster & Portrait Hover Showcase
 * Extracted from carousel-gallery-play/app.js
 */
(function () {
  const ROSTER = [
    { name: 'Kaye Furo', role: 'Club Brugge // Forward', category: 'exclusive', grad: 'linear-gradient(150deg, #1d4ed8, #0f172a)' },
    { name: 'Rein Van Helden', role: 'Royal Antwerp FC // Defender', category: 'exclusive', grad: 'linear-gradient(150deg, #e11d48, #1f2937)' },
    { name: 'Thibaud Verlinden', role: 'OH Leuven // Winger', category: 'all', grad: 'linear-gradient(150deg, #ea580c, #18181b)' },
    { name: 'Sebastiaan Bornauw', role: 'VfL Wolfsburg // Center Back', category: 'exclusive', grad: 'linear-gradient(150deg, #16a34a, #052e16)' },
    { name: 'Ignace Van Der Brempt', role: 'Como 1907 // Fullback', category: 'all', grad: 'linear-gradient(150deg, #0284c7, #0c4a6e)' },
    { name: 'Daan Dierckx', role: 'Standard Liège // Defender', category: 'exclusive', grad: 'linear-gradient(150deg, #dc2626, #450a0a)' },
    { name: 'Pieter Slembrouck', role: 'Founder & Creative Director', category: 'creative', grad: 'linear-gradient(150deg, #9333ea, #2e1065)' },
    { name: 'Jerry Lawyer', role: 'Visual Director & Photographer', category: 'creative', grad: 'linear-gradient(150deg, #eab308, #422006)' }
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
        <div class="portrait-card__media" style="background-image: ${ath.grad};">
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
