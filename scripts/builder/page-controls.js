/**
 * Viewport switcher (desktop / tablet / mobile), theme and custom-colour controls, and "Open in new tab".
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createPageControls(ctx) {
    const {
      stackManager, applyDynamicTheme, featureCache, featuresData, fetchFeatureFiles, historyState: hs,
      themePresetSelect, customThemeToggle, customColorsControls, bgColorInput, textColorInput, accentColorInput
    } = ctx;

    // Viewport elements
    const viewportStage = document.getElementById('viewportStage');
    const viewportDimensionLabel = document.getElementById('viewportDimensionLabel');
    const viewportDesktopBtn = document.getElementById('viewportDesktopBtn');
    const viewportTabletBtn = document.getElementById('viewportTabletBtn');
    const viewportMobileBtn = document.getElementById('viewportMobileBtn');

    // 6. Viewport Controls
    function setViewportMode(mode) {
      hs.viewport = mode;
      stackManager.setViewport(mode);
      if (viewportStage) {
        viewportStage.setAttribute('data-active-viewport', mode);
      }

      const frameWrapper = document.getElementById('viewportFrameWrapper');
      if (frameWrapper) {
        frameWrapper.classList.remove('is-desktop', 'is-tablet', 'is-mobile');
        frameWrapper.classList.add(`is-${mode}`);
      }

      const buttons = [
        { el: viewportDesktopBtn, mode: 'desktop', label: 'Desktop (100%)' },
        { el: viewportTabletBtn, mode: 'tablet', label: 'Tablet (768px)' },
        { el: viewportMobileBtn, mode: 'mobile', label: 'Mobile (375px)' }
      ];

      buttons.forEach(b => {
        if (b.el) {
          if (b.mode === mode) {
            b.el.classList.add('is-active');
            b.el.setAttribute('aria-pressed', 'true');
            if (viewportDimensionLabel) viewportDimensionLabel.textContent = b.label;
          } else {
            b.el.classList.remove('is-active');
            b.el.setAttribute('aria-pressed', 'false');
          }
        }
      });
    }

    if (viewportDesktopBtn) {
      viewportDesktopBtn.addEventListener('click', () => setViewportMode('desktop'));
    }
    if (viewportTabletBtn) {
      viewportTabletBtn.addEventListener('click', () => setViewportMode('tablet'));
    }
    if (viewportMobileBtn) {
      viewportMobileBtn.addEventListener('click', () => setViewportMode('mobile'));
    }

    // 7. Theme Controls
    if (themePresetSelect) {
      themePresetSelect.addEventListener('change', (e) => {
        const themeKey = e.target.value;
        if (themeKey === 'custom') {
          setColorsPanel(true);
          const customColors = {
            bg: bgColorInput ? bgColorInput.value : '#0b0f19',
            text: textColorInput ? textColorInput.value : '#f3f4f6',
            accent: accentColorInput ? accentColorInput.value : '#6366f1'
          };
          applyDynamicTheme(customColors);
          if (stackManager.getState().theme !== 'custom') {
            stackManager.setTheme('custom');
          }
          stackManager.setCustomColors(customColors);
        } else {
          const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
          const preset = presets[themeKey];
          if (preset) {
            if (bgColorInput) bgColorInput.value = preset.bg;
            if (textColorInput) textColorInput.value = preset.text;
            if (accentColorInput) accentColorInput.value = preset.accent;
            applyDynamicTheme(preset);
          }
          stackManager.setTheme(themeKey);
        }
      });
    }

    // "Other look": the theme the visitor's dark/light button switches to: a theme of the opposite look, or the client's own colours (the default is shown until one is picked)
    const altThemeSelect = document.getElementById('altThemeSelect');
    const altControls = document.getElementById('altCustomControls');
    const altInputs = { bg: document.getElementById('altBgColor'), text: document.getElementById('altTextColor'), accent: document.getElementById('altAccentColor') };
    const altHint = document.getElementById('altCustomHint');
    const HEX = /^#[0-9a-fA-F]{6}$/;
    function refreshAltTheme() {
      const A = window.Assembler;
      if (!altThemeSelect || !A || !A.THEME_PRESETS) return;
      const st = stackManager.getState();
      const now = st.theme === 'custom' ? st.customColors : st.theme;
      const curDark = A.isDarkTheme(A.resolveTheme(now));
      const options = Object.keys(A.THEME_PRESETS).filter(k => A.isDarkTheme(A.THEME_PRESETS[k]) !== curDark).map(k => [k, A.THEME_PRESETS[k].name]).concat([['custom', 'Custom colours...']]);
      const sig = options.map(o => o[0]).join();
      if (altThemeSelect.getAttribute('data-sig') !== sig) {
        altThemeSelect.textContent = '';
        options.forEach(([v, label]) => { const o = document.createElement('option'); o.value = v; o.textContent = label; altThemeSelect.appendChild(o); });
        altThemeSelect.setAttribute('data-sig', sig);
      }
      // the other look only matters while a header on the page has the light/dark button and it is not switched off (Light/dark mode tab of the admin panel)
      const reg = window.FEATURE_REGISTRY || [];
      const wanted = st.page.modeButton !== 'off' && st.stack.some(sec => !sec.hidden && reg.some(f => f.slug === sec.slug && f.langSlot));
      const altWrap = document.getElementById('altThemeWrap');
      if (altWrap) altWrap.hidden = !wanted;
      const want = (st.page && st.page.altTheme) || '';
      altThemeSelect.value = options.some(o => o[0] === want) ? want : A.altTheme(now, '').id;
      const custom = altThemeSelect.value === 'custom';
      if (altControls) altControls.style.display = custom ? 'inline-flex' : 'none';
      if (custom) {
        const dflt = A.altTheme(now, '');
        const own = { bg: st.page.altBg, text: st.page.altText, accent: st.page.altAccent };
        ['bg', 'text', 'accent'].forEach(k => { if (altInputs[k]) altInputs[k].value = HEX.test(own[k]) ? own[k] : dflt[k]; });
        const ok = HEX.test(own.bg) && A.isDarkTheme({ bg: own.bg }) !== curDark;
        if (altHint) { altHint.hidden = ok || !HEX.test(own.bg); altHint.textContent = 'The background needs to be ' + (curDark ? 'light' : 'dark') + ' to be the other look.'; }
      } else if (altHint) altHint.hidden = true;
    }
    function saveAltCustom() {
      stackManager.setPage({ altTheme: 'custom', altBg: altInputs.bg.value, altText: altInputs.text.value, altAccent: altInputs.accent.value });
    }
    if (altThemeSelect) {
      altThemeSelect.addEventListener('change', () => {
        if (altThemeSelect.value !== 'custom') { stackManager.setPage({ altTheme: altThemeSelect.value }); return; }
        // start from the colours the other look has now, so the first change is small
        const A = window.Assembler, st = stackManager.getState();
        const d = A.altTheme(st.theme === 'custom' ? st.customColors : st.theme, st.page.altTheme || '', { bg: st.page.altBg, text: st.page.altText, accent: st.page.altAccent });
        stackManager.setPage({ altTheme: 'custom', altBg: HEX.test(st.page.altBg) ? st.page.altBg : d.bg, altText: HEX.test(st.page.altText) ? st.page.altText : d.text, altAccent: HEX.test(st.page.altAccent) ? st.page.altAccent : d.accent });
      });
      let altTimer = null;
      Object.values(altInputs).forEach(inp => { if (inp) inp.addEventListener('input', () => { clearTimeout(altTimer); altTimer = setTimeout(saveAltCustom, 150); }); });
      stackManager.subscribe(refreshAltTheme);
      refreshAltTheme();
    }

    // the Palette button opens the colours panel (your colours, and the other look); it closes with a click outside or Escape
    function setColorsPanel(open) {
      if (!customColorsControls) return;
      customColorsControls.style.display = open ? 'inline-flex' : 'none';
      if (customThemeToggle) { customThemeToggle.classList.toggle('is-active', open); customThemeToggle.setAttribute('aria-expanded', String(open)); }
    }
    if (customThemeToggle) {
      customThemeToggle.addEventListener('click', () => setColorsPanel(customColorsControls.style.display === 'none'));
    }
    document.addEventListener('click', (e) => {
      if (!customColorsControls || customColorsControls.style.display === 'none') return;
      if (customColorsControls.contains(e.target) || (customThemeToggle && customThemeToggle.contains(e.target)) || (themePresetSelect && themePresetSelect.contains(e.target))) return;
      setColorsPanel(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && customColorsControls && customColorsControls.style.display !== 'none') { setColorsPanel(false); if (customThemeToggle) customThemeToggle.focus(); } });

    let themeDebounceTimer = null;

    function handleCustomColorInput() {
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };

      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }

      // Immediately propagate theme variables to iframe in real time via postMessage/DOM
      applyDynamicTheme(colors);

      // Debounce updating state and srcdoc to prevent lag during rapid slider dragging
      clearTimeout(themeDebounceTimer);
      themeDebounceTimer = setTimeout(() => {
        if (stackManager.getState().theme !== 'custom') {
          stackManager.setTheme('custom');
        }
        stackManager.setCustomColors(colors);
      }, 120);
    }

    function handleCustomColorChange() {
      clearTimeout(themeDebounceTimer);
      const colors = {
        bg: bgColorInput ? bgColorInput.value : '#0b0f19',
        text: textColorInput ? textColorInput.value : '#f3f4f6',
        accent: accentColorInput ? accentColorInput.value : '#6366f1'
      };

      if (themePresetSelect && themePresetSelect.value !== 'custom') {
        themePresetSelect.value = 'custom';
      }

      applyDynamicTheme(colors);

      // Consolidate updates: set theme only if needed, setCustomColors triggers notify() once
      if (stackManager.getState().theme !== 'custom') {
        stackManager.setTheme('custom');
      }
      stackManager.setCustomColors(colors);
    }

    if (bgColorInput) {
      bgColorInput.addEventListener('input', handleCustomColorInput);
      bgColorInput.addEventListener('change', handleCustomColorChange);
    }
    if (textColorInput) {
      textColorInput.addEventListener('input', handleCustomColorInput);
      textColorInput.addEventListener('change', handleCustomColorChange);
    }
    if (accentColorInput) {
      accentColorInput.addEventListener('input', handleCustomColorInput);
      accentColorInput.addEventListener('change', handleCustomColorChange);
    }

    // 8. Open in New Tab Action
    const openInTabBtn = document.getElementById('openInTabBtn') || document.getElementById('openNewTabBtn');
    if (openInTabBtn) {
      openInTabBtn.addEventListener('click', async () => {
        if (!window.Assembler || typeof window.Assembler.assemblePreviewDocument !== 'function') {
          showToast('Assembler engine not available');
          return;
        }

        // Opened first, while the click still counts for pop-up blockers. A blob: page would inherit the builder's strict
        // policy and lose every inline style, so the page goes into the preview frame page, which has its own policy.
        const frameUrl = (window.FrameDoc && window.FrameDoc.FRAME_URL) || 'preview-frame/';
        const newTab = window.open(frameUrl, '_blank');
        if (!newTab) {
          showToast('Pop-up was blocked. Please allow pop-ups for this page.');
          return;
        }

        const state = stackManager.getState();
        const missingSlugs = state.stack
          .map(s => s.slug)
          .filter(slug => slug && !featureCache.has(slug));

        if (missingSlugs.length > 0) {
          await Promise.all(missingSlugs.map(slug => fetchFeatureFiles(slug)));
        }

        const themeConfig = state.theme === 'custom' ? state.customColors : state.theme;
        const fullDoc = window.Assembler.assemblePreviewDocument(state.stack, themeConfig, featuresData, { embedSites: true });

        try {
          await new Promise((resolve, reject) => {
            const started = Date.now();
            (function put() {
              try {
                const d = newTab.document;
                if (newTab.location.href.indexOf('/preview-frame/') !== -1 && d.readyState === 'complete') {
                  d.open(); d.write(fullDoc); d.close();
                  resolve();
                } else if (Date.now() - started > 10000) {
                  reject(new Error('preview tab did not load'));
                } else {
                  setTimeout(put, 30);
                }
              } catch (e) { reject(e); }
            })();
          });
          showToast('Opened live assembled preview in new tab');
        } catch (err) {
          console.error('Error opening preview in new tab:', err);
          try { newTab.close(); } catch (_) { /* already gone */ }
          showToast('Failed to open preview tab');
        }
      });
    }

    return { setViewportMode };
  }

  const api = { createPageControls };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderPageControls = api;
})();
