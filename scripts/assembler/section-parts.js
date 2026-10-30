/**
 * Pieces of a section that the live preview and the export build the same way: its id and slug, where its code comes
 * from, whether it is a preloader, its theme attributes and the <section> element around its content.
 * Part of the split of scripts/assembler.js (docs/superpowers/plans/2026-10-30-split-assembler.md).
 * Loaded by builder.html before assembler.js; also usable from Node via require().
 */
(function () {
  const { sectionThemeAttr } = (typeof window !== 'undefined' && window.AsmTheme) || require('./theme.js');

  /** The id (container) and slug of a section, with the position-based fallbacks. */
  function sectionIdentity(section, index) {
    return { id: section.id || `sec-${index + 1}`, slug: section.slug || `section-${index + 1}` };
  }

  /** `html`, `css` or `js` of a section: its own copy when it has one, else the block's file, else ''. */
  function pickSource(section, featuresData, slug, key) {
    return section[key] !== undefined ? section[key] : (featuresData[slug] && featuresData[slug][key]) || '';
  }

  function isPreloaderSection(slug, section) {
    return slug.includes('preloader') || (section.category && section.category.toLowerCase().includes('preloader'));
  }

  /** The data attributes that tell a section which native palettes it follows and whether it keeps its own colours. */
  function nativeAttrFor(nativeList, slug, options) {
    return (nativeList.length ? ` data-native-for="${nativeList.join(' ')}"` : '') + ((options.ownPalette || {})[slug] ? ' data-own-palette="true"' : '');
  }

  /** The <section> element: the comment, the anchor, the classes and attributes, and `inner` as its content. */
  function renderSectionTag({ slug, id, section, isDark, isPreloader, preloaderClass, nativeList, nativeAttr, styleAttr, anchor, inner }) {
    return `  <!-- Section: ${slug} -->\n${anchor}  <section class="page-section${preloaderClass}${section.sticky === true ? ' is-sticky' : ''}${!isPreloader && sectionThemeAttr(isDark, nativeList) === 'dark' ? ' dark' : ''}" id="${id}" data-section-slug="${slug}" data-theme="${sectionThemeAttr(isDark, nativeList)}"${nativeAttr}${styleAttr}>\n    ${inner}\n  </section>`;
  }

  const api = { sectionIdentity, pickSource, isPreloaderSection, nativeAttrFor, renderSectionTag };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.AsmParts = api;
})();
