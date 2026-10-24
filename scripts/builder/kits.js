/**
 * Kits: hand-picked section lists for common kinds of site, loaded into a new project in one click.
 * Unlike starters (built from tags), a kit is an exact, reviewed order of sections. A kit with a missing or heavy
 * component is hidden, and tests/test-kits.js fails, so kits cannot rot silently.
 * Browser: window.BuilderKits. Node: require().
 */
(function () {
  'use strict';

  const KITS = [
    { id: 'saas-launch', label: 'SaaS launch page', theme: 'midnight-dark', title: 'Product launch', sections: ['sticky-shrink-header', 'oklch-ambient-glow-hero', 'logo-cloud-grid', 'feature-grid-icons', 'stats-count-up', 'pricing-table-switch', 'faq-accordion-smooth', 'cta-band', 'cta-footer'] },
    { id: 'portfolio', label: 'Designer portfolio', theme: 'midnight-dark', title: 'Portfolio', sections: ['centered-logo-header', 'brushstroke-portfolio-hero', 'portfolio-masonry-filter', 'stats-count-up', 'contact-form-validated', 'minimal-credits-footer'] },
    { id: 'shop', label: 'Online shop home', theme: 'midnight-dark', title: 'Shop', sections: ['search-first-header', 'gradient-bar-hero-section', 'feature-grid-icons', 'logo-cloud-grid', 'testimonial-v2', 'cookie-notice-bar', 'sitemap-newsletter-footer'] },
    { id: 'agency', label: 'Agency site', theme: 'midnight-dark', title: 'Agency', sections: ['split-nav-announcement', 'mascot-portfolio-hero', 'client-logo-marquee', 'spotlight-bento-grid', 'stagger-testimonials', 'team-grid-simple', 'cta-band', 'hover-footer'] },
    { id: 'event', label: 'Event or course sign-up', theme: 'midnight-dark', title: 'Event', sections: ['responsive-burger-menu', 'waitlist-hero', 'stats-count-up', 'feature-grid-icons', 'multi-step-form', 'faq-accordion-smooth', 'kiln-wordmark-footer'] },
    { id: 'small-business', label: 'Small business', theme: 'midnight-dark', title: 'Small business', sections: ['centered-logo-header', 'oklch-ambient-glow-hero', 'feature-grid-icons', 'team-grid-simple', 'testimonial-v2', 'contact-form-validated', 'cta-footer'] }
  ];

  const usable = (item) => item && item.status !== 'draft' && item.status !== 'deprecated' && item.weight !== 'heavy' && !item.isWidget;

  /** Kits whose every section exists and is usable: [{ id, label, theme, title, sections: [{slug,title,category}] }] */
  function listKits(registry) {
    const bySlug = new Map((registry || []).map(i => [i.slug, i]));
    return KITS.map(k => ({ ...k, sections: k.sections.map(slug => bySlug.get(slug)) }))
      .filter(k => k.sections.every(usable))
      .map(k => ({ ...k, sections: k.sections.map(i => ({ slug: i.slug, title: i.title || i.slug, category: i.category })) }));
  }

  const api = { KITS, listKits };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderKits = api;
})();
