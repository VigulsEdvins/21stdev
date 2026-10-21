/**
 * Editorial Smooth-Height FAQ Accordion
 * Extracted from carousel-gallery-play/app.js (bindFaqTriggers)
 */
(function () {
  const FAQS = [
    {
      q: 'How are these features structured for fast re-use in new projects?',
      a: 'Every feature is isolated in its own standalone folder with clean HTML, scoped CSS, and zero-dependency JavaScript so you or an agent can drop it straight into any codebase.'
    },
    {
      q: 'Can I use these components in both Vanilla JS and React / Next.js?',
      a: 'Yes. Every component includes standalone HTML/CSS/JS that runs directly in the browser, and React components like Works Wheel and Polaroid String also include their full TypeScript .tsx source.'
    },
    {
      q: 'How does the CSS Grid 0fr to 1fr height transition work?',
      a: 'Instead of animating max-height with magic pixel values, the panel uses display: grid with grid-template-rows: 0fr collapsed and 1fr expanded, giving hardware-smooth height interpolation.'
    },
    {
      q: 'How do I instruct an AI agent to add a new design to this library?',
      a: 'Simply tell the agent to create a new folder under features/<slug>/ and run node scripts/sync-registry.js, or use the + Add Feature button right in the top bar.'
    }
  ];

  const container = document.getElementById('faq-container');
  if (!container) return;

  container.innerHTML = FAQS.map((item, idx) => {
    const isFirst = idx === 0;
    return `
      <div class="faq-item">
        <h3>
          <button class="faq-trigger" type="button" aria-expanded="${isFirst ? 'true' : 'false'}" aria-controls="faq-panel-${idx}">
            <span>${item.q}</span>
            <svg class="faq-trigger__icon" viewBox="0 0 448 512" aria-hidden="true">
              <path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
            </svg>
          </button>
        </h3>
        <div id="faq-panel-${idx}" class="faq-panel${isFirst ? ' is-open' : ''}">
          <div class="faq-panel__inner">
            <p>${item.a}</p>
          </div>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.faq-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      const panelId = trigger.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      trigger.setAttribute('aria-expanded', String(!isExpanded));
      if (panel) panel.classList.toggle('is-open', !isExpanded);
    });
  });
})();
