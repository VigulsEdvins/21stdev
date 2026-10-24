/**
 * Starter pages by industry: builds a ready-to-edit section list from the registry's own filters, so new
 * components join the starters without anyone editing a list.
 * For an industry it picks, in page order: a navigation, a hero, up to three body sections (cards, galleries,
 * scroll or interaction sections), a closing call to action and a footer. Components made for that industry come
 * first, general-purpose ones fill the gaps; heavy (WebGL) and draft items are avoided.
 * Browser: window.BuilderStarters. Node: require().
 */
(function () {
  'use strict';

  // page order -> the categories that can fill that slot
  const SLOTS = [
    { id: 'nav', categories: ['Headers & Nav'], count: 1 },
    { id: 'hero', categories: ['Heroes'], count: 1 },
    { id: 'body', categories: ['Cards & Tiles', 'Galleries & Bento', 'Scroll & Parallax', 'Interactions & Physics', '3D & Carousels'], count: 3 },
    { id: 'cta', categories: ['Buttons & UI'], count: 1 },
    { id: 'footer', categories: ['Footers & Endings'], count: 1 }
  ];
  const MIN_SECTIONS = 4;
  const MIN_OWN = 8; // an industry needs this many components of its own to get a starter

  const usable = (item) => item && !item.isWidget && item.status !== 'draft' && item.weight !== 'heavy' && item.type !== 'template';
  const forIndustry = (item, industry) => (item.industry || []).includes(industry);

  /** The starter for one industry: [{ slug, title, category }] in page order. */
  function buildStarter(registry, industry) {
    const items = (registry || []).filter(usable).sort((a, b) => a.slug.localeCompare(b.slug));
    const used = new Set();
    const out = [];
    SLOTS.forEach(slot => {
      const pool = items.filter(i => slot.categories.includes(i.category) && !used.has(i.slug));
      // the industry's own components first; for "body", spread over different categories
      const own = pool.filter(i => forIndustry(i, industry));
      const general = pool.filter(i => !forIndustry(i, industry) && forIndustry(i, 'general'));
      const ordered = [...own, ...general];
      const picked = [];
      const seenCategory = new Set();
      for (const i of ordered) {
        if (picked.length >= slot.count) break;
        if (slot.id === 'body' && seenCategory.has(i.category) && ordered.some(o => !picked.includes(o) && !seenCategory.has(o.category))) continue;
        picked.push(i);
        seenCategory.add(i.category);
      }
      picked.forEach(i => { used.add(i.slug); out.push({ slug: i.slug, title: i.title || i.slug, category: i.category }); });
    });
    return out;
  }

  /** Industries that have enough components for a starter: [{ industry, label, sections }] */
  function listStarters(registry) {
    const industries = Array.from(new Set((registry || []).flatMap(i => i.industry || []))).filter(x => x !== 'general').sort();
    return industries
      .filter(industry => (registry || []).filter(i => usable(i) && forIndustry(i, industry)).length >= MIN_OWN)
      .map(industry => ({ industry, label: industry.charAt(0).toUpperCase() + industry.slice(1), sections: buildStarter(registry, industry) }))
      .filter(s => s.sections.length >= MIN_SECTIONS);
  }

  const api = { buildStarter, listStarters, SLOTS, MIN_SECTIONS, MIN_OWN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderStarters = api;
})();
