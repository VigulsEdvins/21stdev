/**
 * Landing-page rules: one preloader/header/hero/footer per page, and adding or replacing sections accordingly.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createLandingSections(ctx) {
    const { catalogLib, featuresMap, stackManager, rt } = ctx;

    // Landing Page Singleton Rules:
    // Singletons: Preloader (Optional, index 0), Header (Essential, top), Hero (Essential, after header), Footer (Essential, bottom).
    const LANDING_PAGE_SINGLETONS = {
      preloader: {
        type: 'preloader',
        name: 'Preloader',
        category: 'Preloaders & Shaders',
        necessity: 'optional',
        needLabel: 'Optional',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('preloader') || s.includes('preloader') || t.includes('preloader');
        }
      },
      header: {
        type: 'header',
        name: 'Header',
        category: 'Headers & Nav',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('nav') || c.includes('header') || s.includes('header') || s.includes('nav') || s.includes('burger') || s.includes('menu') || t.includes('header') || t.includes('navbar') || t.includes('navigation');
        }
      },
      hero: {
        type: 'hero',
        name: 'Hero Section',
        category: 'Heroes',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c === 'heroes' || c.includes('hero') || s.includes('hero') || t.includes('hero');
        }
      },
      footer: {
        type: 'footer',
        name: 'Footer',
        category: 'Footers & Endings',
        necessity: 'required',
        needLabel: 'Essential',
        match: (slug, title, cat) => {
          const s = (slug || '').toLowerCase();
          const t = (title || '').toLowerCase();
          const c = (cat || '').toLowerCase();
          return c.includes('footer') || s.includes('footer') || t.includes('footer');
        }
      }
    };

    function getSingletonType(slug, title, cat) {
      if (!slug && !title && !cat) return null;
      for (const [key, def] of Object.entries(LANDING_PAGE_SINGLETONS)) {
        if (def.match(slug, title, cat)) return key;
      }
      return null;
    }

    function findExistingSingleton(type) {
      if (!type || !stackManager) return null;
      const stack = stackManager.getStack();
      return stack.find(sec => {
        const feat = featuresMap.get(sec.slug);
        const title = sec.title || (feat ? (feat.title || feat.name) : '');
        const cat = sec.category || (feat ? feat.category : '');
        return getSingletonType(sec.slug, title, cat) === type;
      }) || null;
    }

    function addOrReplaceLandingSection(slug, extraProps = {}, preferredIndex = null) {
      catalogLib.addRecent(slug);
      const title = extraProps.title || slug;
      const category = extraProps.category || '';
      const singletonType = getSingletonType(slug, title, category);

      if (singletonType === 'preloader') {
        // Explicitly added or replaced preloader: play once
        rt.preloaderForceReplay = true;
        rt.playedPreloaderId = null;
      }

      if (singletonType) {
        const singletonDef = LANDING_PAGE_SINGLETONS[singletonType];
        const existing = findExistingSingleton(singletonType);

        if (existing) {
          // Landing page can only have one! Replace the existing singleton in place
          let replaced;
          if (typeof stackManager.replaceSection === 'function') {
            replaced = stackManager.replaceSection(existing.id, slug, extraProps);
          } else {
            const stack = stackManager.getStack();
            const idx = stack.findIndex(s => s.id === existing.id);
            stackManager.removeSection(existing.id);
            replaced = stackManager.insertSection(idx >= 0 ? idx : stackManager.getStack().length, slug, extraProps);
          }

          // Ensure proper canonical position if needed (Preloader at 0, Header at 0/1, Footer at bottom)
          if (singletonType === 'preloader') {
            const stack = stackManager.getStack();
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx > 0) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, -currIdx);
            }
          } else if (singletonType === 'header') {
            const stack = stackManager.getStack();
            const preloader = findExistingSingleton('preloader');
            const targetPos = preloader ? 1 : 0;
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx !== targetPos && currIdx >= 0) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, targetPos - currIdx);
            }
          } else if (singletonType === 'footer') {
            const stack = stackManager.getStack();
            const currIdx = stack.findIndex(s => s.id === (replaced ? replaced.id : existing.id));
            if (currIdx >= 0 && currIdx < stack.length - 1) {
              stackManager.moveSection(replaced ? replaced.id : existing.id, (stack.length - 1) - currIdx);
            }
          }

          showToast(`Landing page can only have one ${singletonDef.name}. Replaced with "${title}".`);
          return { section: replaced, replaced: true, singletonType };
        } else {
          // No existing singleton: insert at canonical position
          let targetIndex = preferredIndex;
          if (singletonType === 'preloader') {
            targetIndex = 0; // Preloaders always go at the very top (entry screen)
          } else if (singletonType === 'header') {
            const preloader = findExistingSingleton('preloader');
            targetIndex = preloader ? 1 : 0; // Header goes after preloader if present, else 0
          } else if (singletonType === 'hero') {
            const header = findExistingSingleton('header');
            if (header) {
              const stack = stackManager.getStack();
              const headerIdx = stack.findIndex(s => s.id === header.id);
              targetIndex = headerIdx >= 0 ? headerIdx + 1 : 1;
            } else {
              const preloader = findExistingSingleton('preloader');
              targetIndex = preloader ? 1 : 0;
            }
          } else if (singletonType === 'footer') {
            targetIndex = stackManager.getStack().length;
          } else if (targetIndex === null || targetIndex === undefined) {
            const footer = findExistingSingleton('footer');
            if (footer) {
              const stack = stackManager.getStack();
              const footerIdx = stack.findIndex(s => s.id === footer.id);
              targetIndex = footerIdx >= 0 ? footerIdx : stack.length;
            } else {
              targetIndex = stackManager.getStack().length;
            }
          }

          const newSec = stackManager.insertSection(targetIndex, slug, extraProps);
          showToast(`Added ${singletonDef.name}: "${title}"`);
          return { section: newSec, replaced: false, singletonType };
        }
      }

      // Non-singleton component: if footer exists at end, keep footer at bottom by inserting before it
      let targetIndex = preferredIndex;
      if (targetIndex === null || targetIndex === undefined) {
        const footer = findExistingSingleton('footer');
        if (footer) {
          const stack = stackManager.getStack();
          const footerIdx = stack.findIndex(s => s.id === footer.id);
          targetIndex = footerIdx >= 0 ? footerIdx : stack.length;
        } else {
          targetIndex = stackManager.getStack().length;
        }
      }

      const newSec = stackManager.insertSection(targetIndex, slug, extraProps);
      showToast(`Added "${title}"`);
      return { section: newSec, replaced: false, singletonType: null };
    }

    /** A full website (own pages and CMS) or a landing page (a whole page in one section) replaces everything else on the page. */
    function isFullWebsite(slug) {
      const f = (featuresMap && featuresMap.get && featuresMap.get(slug)) || {};
      return !!f.liveSiteUrl || f.category === 'Full Websites' || f.category === 'Landing Pages';
    }
    function isLandingPageSlug(slug) {
      const f = (featuresMap && featuresMap.get && featuresMap.get(slug)) || {};
      return !f.liveSiteUrl && f.category === 'Landing Pages';
    }

    /**
     * Adds a section from the catalogue. A full website first asks, because it throws away the page's sections:
     * resolves to the same result as addOrReplaceLandingSection, or null when the person says no.
     */
    async function addWithTemplateGuard(slug, extraProps = {}, preferredIndex = null) {
      const access = typeof window !== 'undefined' ? window.BuilderAccess : null;
      if (access && access.locked(slug)) { // a block that needs a free account (scripts/builder/access.js): invite, add nothing
        access.prompt(extraProps.title || (featuresMap.get(slug) || {}).title || slug);
        return null;
      }
      const existing = stackManager.getStack();
      if (!isFullWebsite(slug) || existing.length === 0) {
        return addOrReplaceLandingSection(slug, extraProps, preferredIndex);
      }
      const title = extraProps.title || (featuresMap.get(slug) || {}).title || slug;
      const locked = existing.filter(sec => sec.locked).length;
      const kind = isLandingPageSlug(slug) ? 'landing page' : 'full website';
      const ok = await window.BuilderConfirm.ask({
        title: `Use the ${kind} “${title}”?`,
        message: `A ${kind} is a complete ${kind === 'landing page' ? 'page' : 'site'}, not one section. Using it replaces the page you have built so far.`,
        details: [
          `All ${existing.length} section${existing.length === 1 ? '' : 's'} on this page will be discarded${locked ? ` (including ${locked} locked)` : ''}, whether you added them or came from a template.`,
          'Edits to their content and sizing go with them.',
          'Your theme, colours, page title and settings stay.',
          'Undo brings the old page back.'
        ],
        confirmLabel: 'Yes, replace the page',
        cancelLabel: 'Keep my page'
      });
      if (!ok) return null;
      catalogLib.addRecent(slug);
      rt.preloaderForceReplay = false;
      const section = stackManager.replaceAllWithSection(slug, extraProps);
      showToast(`Page replaced with “${title}”`);
      return { section, replaced: true, singletonType: null, wholePage: true };
    }

    return { LANDING_PAGE_SINGLETONS, getSingletonType, findExistingSingleton, addOrReplaceLandingSection, addWithTemplateGuard, isFullWebsite };
  }

  const api = { createLandingSections };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderLanding = api;
})();
