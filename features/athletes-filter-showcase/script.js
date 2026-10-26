/**
 * Filterable Roster & Portrait Hover Showcase
 * Category-filtered portrait cards with placeholder artwork
 */
(function () {
  const ROSTER = [
    { name: 'Marlo Vance', role: 'Northport FC // Forward', category: 'exclusive', img: '/assets/library/edv-art-01.svg' },
    { name: 'Teodor Halm', role: 'Eastvale United // Striker', category: 'exclusive', img: '/assets/library/edv-art-02.svg' },
    { name: 'Idris Calloway', role: 'Lakeside Rovers // Winger', category: 'all', img: '/assets/library/edv-art-03.svg' },
    { name: 'Bastien Orlo', role: 'Ironbridge SC // Center Back', category: 'exclusive', img: '/assets/library/edv-art-04.svg' },
    { name: 'Ivo Lindqvist', role: 'Harbourside Athletic // Fullback', category: 'all', img: '/assets/library/edv-art-05.svg' },
    { name: 'Tomas Adeyemi', role: 'Redmoor Town // Striker', category: 'exclusive', img: '/assets/library/edv-art-06.svg' },
    { name: 'Stefan Brandt', role: 'Eastvale United // Creative Midfielder', category: 'creative', img: '/assets/library/edv-art-07.svg' },
    { name: 'Juno Laverne', role: 'Visual Director & Photographer', category: 'creative', img: '/assets/library/edv-art-08.svg' }
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
