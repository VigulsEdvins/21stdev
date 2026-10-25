/**
 * Category normalisation and matching for the builder sidebar and drawer.
 * Loaded by builder.html before builder.js; also usable from Node via require().
 */
(function () {
  'use strict';

  // Normalized Category Resolver
  function getNormalizedCategory(feature) {
    if (!feature) return 'Component';
    const cat = (feature.category || '').trim();
    const slug = (feature.slug || '').toLowerCase();
    const title = (feature.title || feature.name || '').toLowerCase();

    // 0. A whole website (own pages and CMS) or a whole landing page: the category in meta.json decides
    if (feature.liveSiteUrl || cat === 'Full Websites') return 'Full Websites';
    if (cat === 'Landing Pages') return 'Landing Pages';

    // 1. Footers & Endings
    if (slug.includes('footer') || title.includes('footer') || cat.toLowerCase().includes('footer')) {
      return 'Footers & Endings';
    }

    // 2. Pricing & Tables
    if (slug.includes('pricing') || title.includes('pricing') || slug.includes('turntable') || title.includes('turntable') || slug.includes('matrix')) {
      return 'Pricing & Tables';
    }

    // 3. Headers & Nav
    if (slug.includes('nav') || slug.includes('menu') || slug.includes('burger') || slug.includes('header') || slug.includes('lang-switcher') || cat.toLowerCase().includes('navigation')) {
      return 'Headers & Nav';
    }

    // 4. Heroes
    if (slug.includes('hero') || title.includes('hero') || cat.toLowerCase() === 'heroes') {
      return 'Heroes';
    }

    // 5. Buttons & UI
    if (cat.toLowerCase().includes('button') || slug.includes('btn') || slug.includes('button') || slug.includes('cta') || slug.includes('drawer') || slug.includes('accordion') || slug.includes('tabs')) {
      return 'Buttons & UI';
    }

    // 6. Cards & Tiles
    if (cat.toLowerCase().includes('cards') || slug.includes('card') || slug.includes('ticket') || slug.includes('testimonial')) {
      return 'Cards & Tiles';
    }

    // 7. Galleries & Bento
    if (cat.toLowerCase().includes('galleries') || cat.toLowerCase().includes('layouts') || slug.includes('bento') || slug.includes('gallery') || slug.includes('marquee') || slug.includes('showcase')) {
      return 'Galleries & Bento';
    }

    // 8. 3D & Carousels
    if (cat.toLowerCase().includes('3d') || cat.toLowerCase().includes('carousel') || slug.includes('carousel') || slug.includes('3d') || slug.includes('wheel')) {
      return '3D & Carousels';
    }

    // 9. Scroll & Parallax
    if (cat.toLowerCase().includes('scroll') || cat.toLowerCase().includes('parallax') || slug.includes('parallax') || slug.includes('scroll') || slug.includes('timeline')) {
      return 'Scroll & Parallax';
    }

    // 10. Preloaders & Shaders
    if (cat.toLowerCase().includes('preloader') || slug.includes('preloader')) {
      return 'Preloaders & Shaders';
    }

    // 11. Audio & Shaders
    if (cat.toLowerCase().includes('audio') || slug.includes('audio') || slug.includes('sound') || slug.includes('shader')) {
      return 'Audio & Shaders';
    }

    // 12. Full Websites (a whole site with its own pages and CMS) and Landing Pages (a whole page in one section)
    if (feature.liveSiteUrl || cat.toLowerCase().includes('full websites')) {
      return 'Full Websites';
    }
    if (cat.toLowerCase().includes('landing pages') || cat.toLowerCase().includes('full templates') || slug.includes('template') || slug.includes('landing')) {
      return 'Landing Pages';
    }

    // 13. Interactions & Physics / Cursors
    if (cat.toLowerCase().includes('physics') || cat.toLowerCase().includes('cursor') || cat.toLowerCase().includes('form')) {
      return 'Interactions & Physics';
    }

    return cat || 'Component';
  }

  // Category matching rule: maps registry categories/tags to drawer and sidebar categories
  function matchesCategory(feature, targetCategory) {
    if (!targetCategory || targetCategory === 'all') return true;
    const norm = getNormalizedCategory(feature);
    const targetNorm = targetCategory.toLowerCase().trim();
    const currentNorm = norm.toLowerCase().trim();

    if (currentNorm === targetNorm) return true;
    if ((targetNorm === 'footers' || targetNorm === 'footers & endings') && currentNorm.includes('footer')) return true;
    if ((targetNorm === 'headers & nav' || targetNorm === 'navigation & headers') && currentNorm.includes('nav')) return true;
    if ((targetNorm === 'pricing & tables' || targetNorm === 'tables & pricing') && (currentNorm.includes('pricing') || currentNorm.includes('table'))) return true;
    if (targetNorm === 'buttons & ui' && (currentNorm.includes('button') || currentNorm.includes('ui'))) return true;
    if (targetNorm === 'cards & tiles' && currentNorm.includes('card')) return true;
    if ((targetNorm === 'galleries & bento' || targetNorm === 'galleries & grids') && (currentNorm.includes('galleries') || currentNorm.includes('grid') || currentNorm.includes('bento'))) return true;
    if (targetNorm === '3d & carousels' && (currentNorm.includes('3d') || currentNorm.includes('carousel'))) return true;
    if (targetNorm === 'scroll & parallax' && (currentNorm.includes('scroll') || currentNorm.includes('parallax'))) return true;
    if (targetNorm === 'audio & shaders' && (currentNorm.includes('audio') || currentNorm.includes('shader'))) return true;
    if ((targetNorm === 'interactions & physics' || targetNorm === 'physics & cursors') && currentNorm.includes('physics')) return true;
    if ((targetNorm === 'preloaders & shaders' || targetNorm === 'preloaders') && currentNorm.includes('preloader')) return true;

    return currentNorm.includes(targetNorm);
  }

  const api = { getNormalizedCategory, matchesCategory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderCategories = api;
})();
