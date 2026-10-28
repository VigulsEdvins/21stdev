/**
 * The twelve everyday kinds of block (plan E6.3). The questions and the recommendation rules speak in these ids
 * (site/js/questions.js BLOCKS); each kind lists the real registry components that can stand for it, best first.
 * A kind with no variants is shown as "not ready yet" instead of being hidden, so the gap is visible.
 * tests/test-block-kinds.js checks that every slug exists in registry.json, is stable and is not heavy.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BuilderBlockKinds = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const KINDS = [
    { id: 'banner', label: 'Opening banner', about: 'The first thing people see.', variants: ['brushstroke-portfolio-hero', 'ink-orbit-hero', 'polaroid-zine-hero', 'mascot-portfolio-hero', 'waitlist-hero'] },
    { id: 'about', label: 'About you', about: 'A short story about who you are.', variants: ['seam-history-timeline', 'pigment-experience-ledger'] },
    { id: 'services', label: 'What you offer', about: 'The things you do or sell.', variants: ['feature-grid-icons', 'file-card-collections', 'glass-folder-cards'] },
    { id: 'prices', label: 'Prices', about: 'What things cost.', variants: ['pricing-table-switch', 'plan-comparison-matrix'] },
    { id: 'gallery', label: 'Gallery', about: 'Photos of your work.', variants: ['hairline-bento-portfolio', 'hover-expand-gallery', 'spotlight-bento-grid', 'news-3col-masonry'] },
    { id: 'reviews', label: 'What customers say', about: 'A few kind words from others.', variants: ['stagger-testimonials', 'checker-quilt-testimonials', 'glass-fan-testimonials', 'testimonial-v2'] },
    { id: 'faq', label: 'Questions and answers', about: 'The things people always ask.', variants: ['faq-accordion-smooth', 'slit-type-faq'] },
    { id: 'contact', label: 'Contact form', about: 'A way to write to you.', variants: ['contact-form-validated', 'wirebound-inquiry'] },
    { id: 'map', label: 'Map and opening hours', about: 'Where you are and when.', variants: [] },
    { id: 'newsletter', label: 'Newsletter sign-up', about: 'Collect email addresses.', variants: ['wordmark-newsletter-signup'] },
    { id: 'team', label: 'Your team', about: 'Who people will meet.', variants: ['team-grid-simple'] },
    { id: 'process', label: 'How you work', about: 'Your steps, one by one.', variants: ['storyline-timeline', 'timeline-inertia-drag'] }
  ];
  const byId = Object.fromEntries(KINDS.map((k) => [k.id, k]));
  /** the kind a slug belongs to, or null (a block from the full catalogue) */
  const kindOf = (slug) => (KINDS.find((k) => k.variants.includes(slug)) || null);
  /** the next variant of a kind after `slug`, wrapping round */
  function nextVariant(kindId, slug) {
    const k = byId[kindId]; if (!k || !k.variants.length) return null;
    const i = k.variants.indexOf(slug);
    return k.variants[(i + 1) % k.variants.length];
  }
  return { KINDS, byId, kindOf, nextVariant };
});
