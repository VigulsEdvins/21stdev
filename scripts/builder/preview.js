/**
 * Live preview: assembles the page into the iframe, patches small edits in place, and pushes theme changes.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createPreview(ctx) {
    const {
      stackManager, previewFrame, elementEditToolbar, featureCache, featuresData, fetchFeatureFiles,
      nativeMap, ownPalette, rt, getCanvas
    } = ctx;

    /**
     * Propagates theme variables to the live preview iframe.
     * Uses postMessage and direct DOM property injection for instantaneous 60fps color updates without reload flicker.
     */
    function applyDynamicTheme(themeConfig) {
      const theme = (window.Assembler && typeof window.Assembler.resolveTheme === 'function')
        ? window.Assembler.resolveTheme(themeConfig)
        : themeConfig;

      if (!theme) return;

      // 1. PostMessage to iframe for dynamic zero-flicker update
      if (previewFrame && previewFrame.contentWindow) {
        try {
          previewFrame.contentWindow.postMessage({
            type: 'UPDATE_THEME',
            theme: theme
          }, '*');
        } catch (_) {}
      }

      // 2. Direct style property update on iframe documentElement if same-origin accessible
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          if (window.Assembler && typeof window.Assembler.applyThemeToDocument === 'function') {
            window.Assembler.applyThemeToDocument(doc, theme);
          } else if (doc.documentElement) {
            if (theme.bg) {
              doc.documentElement.style.setProperty('--preview-bg', theme.bg);
              doc.querySelectorAll('.page-section').forEach(s => s.style.backgroundColor = theme.bg);
            }
            if (theme.text) {
              doc.documentElement.style.setProperty('--preview-text', theme.text);
              doc.querySelectorAll('.page-section').forEach(s => s.style.color = theme.text);
            }
            if (theme.accent) doc.documentElement.style.setProperty('--preview-accent', theme.accent);
            if (theme.cardBg) doc.documentElement.style.setProperty('--preview-card-bg', theme.cardBg);
            if (theme.border) doc.documentElement.style.setProperty('--preview-border', theme.border);
          }
        }
      } catch (_) {}
    }

    // 4. Update Live Preview Iframe
    let isUpdatingPreview = false;
    let pendingPreviewUpdate = false;

    async function updatePreview() {
      if (!previewFrame) return;

      if (!window.Assembler || typeof window.Assembler.assemblePreviewDocument !== 'function') {
        return;
      }

      const state = stackManager.getState();
      const currentStack = state.stack;

      // Identify any sections whose source files need fetching
      const missingSlugs = currentStack
        .map(item => item.slug)
        .filter(slug => slug && !featureCache.has(slug));

      if (missingSlugs.length > 0) {
        if (isUpdatingPreview) {
          pendingPreviewUpdate = true;
          return;
        }
        isUpdatingPreview = true;
        try {
          await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
        } catch (err) {
          console.error('Error fetching feature files for preview:', err);
        } finally {
          isUpdatingPreview = false;
          if (pendingPreviewUpdate) {
            pendingPreviewUpdate = false;
            updatePreview();
            return;
          }
        }
      }

      // Re-read latest state and assemble preview document
      const latestState = stackManager.getState();
      const themeConfig = latestState.theme === 'custom' ? latestState.customColors : latestState.theme;

      // Preloader play-state tracking:
      // Requirement: Play ONCE when newly added; suppressed on subsequent section additions/modifications
      // and runs again only when user explicitly runs it via the Replay (▶) button.
      const preloaderSection = latestState.stack.find(s => {
        const slug = s.slug || '';
        const cat = s.category || '';
        return slug.includes('preloader') || cat.toLowerCase().includes('preloader');
      });

      let suppressPreloader = false;
      if (preloaderSection) {
        if (rt.preloaderForceReplay) {
          // Explicitly triggered via Run/Replay button
          suppressPreloader = false;
          rt.preloaderForceReplay = false;
          rt.playedPreloaderId = preloaderSection.id;
        } else if (rt.playedPreloaderId === preloaderSection.id) {
          // Already played: suppress on subsequent section additions/modifications
          suppressPreloader = true;
        } else {
          // Newly added preloader: play once
          suppressPreloader = false;
          rt.playedPreloaderId = preloaderSection.id;
        }
      } else {
        rt.playedPreloaderId = null;
        rt.preloaderForceReplay = false;
      }

      // Only sizing and overlay elements are patched in place; anything else (sections, their
      // source, theme, preloader state) changes this key and triggers a full reload.
      // Yield so callers can set getCanvas().state.pendingElement right after the state change that notified us
      await Promise.resolve();
      const structureKey = JSON.stringify({
        theme: themeConfig,
        suppressPreloader,
        page: latestState.page,
        stack: latestState.stack.map(({ elements, sizing, overrides, ...rest }) => rest)
      });
      const canPatch = !rt.forceFullPreviewReload && structureKey === lastPreviewStructureKey;
      rt.forceFullPreviewReload = false;
      if (canPatch && patchPreviewInPlace(latestState.stack)) {
        return;
      }

      const assembledHtml = window.Assembler.assemblePreviewDocument(
        latestState.stack,
        themeConfig,
        featuresData,
        { suppressPreloader, page: latestState.page, nativeMap, ownPalette }
      );

      lastPreviewStructureKey = structureKey;
      previewFrame.srcdoc = assembledHtml;
    }

    let lastPreviewStructureKey = null;
    /**
     * Patches the loaded preview in place (see scripts/builder/preview-patch.js), then restores the
     * canvas selection on the rebuilt overlay the way the iframe load handler does.
     * Returns false when a full reload is needed instead.
     */
    function patchPreviewInPlace(stack) {
      let doc;
      try {
        doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
      } catch (_) {
        return false;
      }
      if (!(window.PreviewPatch || require('./scripts/builder/preview-patch.js')).patchPreview({ doc, win: previewFrame.contentWindow, stack, assembler: window.Assembler })) return false;

      if (getCanvas().state.pendingElement) {
        const el = doc.getElementById(getCanvas().state.pendingElement.elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          getCanvas().selectCanvasElement(getCanvas().state.pendingElement.sectionId, getCanvas().state.pendingElement.elementId);
          getCanvas().closeToolbarPopup();
        }
        getCanvas().state.pendingElement = null;
      } else if (getCanvas().state.selected) {
        const el = doc.getElementById(getCanvas().state.selected.elementId);
        if (el) {
          el.classList.add('is-selected');
          getCanvas().ensureResizeHandles(el);
          if (elementEditToolbar && elementEditToolbar.style.display !== 'none') getCanvas().updateToolbarPosition();
        } else {
          getCanvas().clearElementSelection();
        }
      }
      return true;
    }

    return { applyDynamicTheme, updatePreview };
  }

  const api = { createPreview };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderPreview = api;
})();
