/**
 * Add Feature Studio of the catalogue: custom features kept in localStorage, plus the modal that creates them.
 */
(function () {
  'use strict';
  const H = (typeof window !== 'undefined' && window.CatalogHelpers) || require('./helpers.js');
  const { combineRuntimeHtml } = H;
  const STORAGE_KEY = '21st_local_custom_features_v1';

  function loadCustomFeatures() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveCustomFeatures(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  /** ctx: { state, showToast(msg), updateHeaderCounts(), renderAll() } */
  function createStudio(ctx) {
    const { state, showToast, updateHeaderCounts, renderAll } = ctx;
    let customFeatures = loadCustomFeatures();
    // Add Feature Studio Modal
    const addFeatureModal = document.getElementById('addFeatureModal');
    const newFeatureName = document.getElementById('newFeatureName');
    const newFeatureSlug = document.getElementById('newFeatureSlug');

    newFeatureName.addEventListener('input', () => {
      newFeatureSlug.value = newFeatureName.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    });

    document.getElementById('openAddModalBtn').addEventListener('click', () => {
      addFeatureModal.classList.remove('is-hidden');
    });

    document.getElementById('closeAddModalBtn').addEventListener('click', () => {
      addFeatureModal.classList.add('is-hidden');
    });

    function buildCustomFeatureFromForm() {
      const name = newFeatureName.value.trim() || 'Custom Feature';
      const slug = (newFeatureSlug.value.trim() || 'custom-feature').toLowerCase();
      const category = document.getElementById('newFeatureCategory').value;
      const source = document.getElementById('newFeatureSource').value.trim() || 'custom';
      const type = document.getElementById('newFeatureType').value;
      const description = document.getElementById('newFeatureDesc').value.trim();
      const tags = document.getElementById('newFeatureTags').value.split(',').map((s) => s.trim()).filter(Boolean);
      const html = document.getElementById('newFeatureHtml').value;
      const css = document.getElementById('newFeatureCss').value;
      const js = document.getElementById('newFeatureJs').value;
      const combined = combineRuntimeHtml(html, css, js);

      return {
        name,
        slug,
        category,
        source,
        type,
        description,
        tags,
        tech: ['Custom HTML/CSS/JS'],
        dependencies: [],
        order: 100 + customFeatures.length,
        folderPath: `features/${slug}`,
        files: { html, css, js, tsx: null, combined }
      };
    }

    document.getElementById('addFeatureForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const item = buildCustomFeatureFromForm();
      customFeatures = customFeatures.filter((f) => f.slug !== item.slug).concat(item);
      saveCustomFeatures(customFeatures);
      updateHeaderCounts();
      state.activeSlug = item.slug;
      addFeatureModal.classList.add('is-hidden');
      renderAll();
      showToast(`Added "${item.name}" to Vault`);
    });

    document.getElementById('exportCustomBundleBtn').addEventListener('click', () => {
      const item = buildCustomFeatureFromForm();
      const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.slug}-vault-bundle.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${item.slug}-vault-bundle.json`);
    });

    document.getElementById('clearCustomFeaturesBtn').addEventListener('click', () => {
      customFeatures = [];
      saveCustomFeatures([]);
      updateHeaderCounts();
      renderAll();
      showToast('Cleared custom localStorage features');
    });

    return { getCustomFeatures: () => customFeatures };
  }

  const api = { createStudio, loadCustomFeatures, saveCustomFeatures };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CatalogStudio = api;
})();
