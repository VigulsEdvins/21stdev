/**
 * Undo / redo history and continuous localStorage persistence of the page state.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function createHistory(ctx) {
    const {
      stackManager, applyDynamicTheme, setViewportMode, renderStackList, updatePreview,
      themePresetSelect, customColorsControls, customThemeToggle, bgColorInput, textColorInput, accentColorInput,
      undoBtn, redoBtn
    } = ctx;

    // =========================================================================
    // History Stack Engine (Undo / Redo) & Continuous LocalStorage Persistence
    // =========================================================================
    const MAX_HISTORY = 50;
    const STORAGE_KEY = 'web_builder_state_v2';
    // State shared with builder.js (read and written through `state`)
    const state = { stack: [], index: -1, applying: false, viewport: 'desktop', extras: null };
    let autoSaveTimer = null;

    function updateHistoryUI() {
      const currentUndoBtn = document.getElementById('undoBtn') || undoBtn;
      const currentRedoBtn = document.getElementById('redoBtn') || redoBtn;
      if (currentUndoBtn) {
        currentUndoBtn.disabled = state.index <= 0;
      }
      if (currentRedoBtn) {
        currentRedoBtn.disabled = state.index >= state.stack.length - 1;
      }
    }

    /** The persisted shape of the page: what autosave, history snapshots and client projects store. */
    function serializeState() {
      const st = stackManager.getState();
      return {
        stack: stackManager.getStack(),
        theme: st.theme || 'midnight-dark',
        customColors: { ...(st.customColors || {}) },
        page: { ...st.page },
        viewport: state.viewport
      };
    }

    /** Replaces the whole page (used when switching client projects) and records it in history. */
    function applyState(snapshot) {
      applyHistoryState(snapshot);
      pushHistorySnapshot();
      saveStateToStorage();
    }

    function saveStateToStorage() {
      if (typeof localStorage === 'undefined') return;
      try {
        const currentState = serializeState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
        if (state.extras) state.extras.onStateSaved(currentState);
      } catch (err) {
        console.warn('Failed to save builder state to localStorage:', err);
      }
    }

    function scheduleAutoSave() {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        autoSaveTimer = null;
        saveStateToStorage();
      }, 200);
    }

    // Autosave is debounced; flush it when the tab is closed or hidden so the last 200ms of edits survive.
    function flushAutoSave() {
      if (!autoSaveTimer) return;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
      saveStateToStorage();
    }
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', flushAutoSave);
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAutoSave(); });
      }
    }

    function pushHistorySnapshot() {
      if (state.applying) return;
      const currentSnapshot = {
        stack: JSON.parse(JSON.stringify(stackManager.getStack())),
        theme: stackManager.getState().theme || 'midnight-dark',
        customColors: { ...(stackManager.getState().customColors || {}) },
        page: { ...stackManager.getState().page },
        viewport: state.viewport
      };

      // If current state matches last snapshot, skip duplicate
      if (state.stack.length > 0 && state.index >= 0 && state.index < state.stack.length) {
        const lastSnapshot = state.stack[state.index];
        if (JSON.stringify(lastSnapshot) === JSON.stringify(currentSnapshot)) {
          return;
        }
      }

      // Discards future redo states
      state.stack = state.stack.slice(0, state.index + 1);

      // Appends snapshot, trims to MAX_HISTORY
      state.stack.push(currentSnapshot);
      if (state.stack.length > MAX_HISTORY) {
        state.stack = state.stack.slice(state.stack.length - MAX_HISTORY);
      }
      state.index = state.stack.length - 1;
      updateHistoryUI();
    }

    function applyHistoryState(snapshot) {
      if (!snapshot) return;
      state.applying = true;

      try {
        // Restore stack
        if (typeof stackManager.setStack === 'function') {
          stackManager.setStack(snapshot.stack || []);
        } else {
          stackManager.clearStack();
          (snapshot.stack || []).forEach(sec => {
            stackManager.insertSection(stackManager.getStack().length, sec);
          });
        }

        if (snapshot.page && typeof stackManager.setPage === 'function') stackManager.setPage(snapshot.page);

        // Restore theme & custom colors
        const theme = snapshot.theme || 'midnight-dark';
        stackManager.setTheme(theme);
        if (themePresetSelect) {
          themePresetSelect.value = theme;
        }

        const customColors = snapshot.customColors || {};
        stackManager.setCustomColors(customColors);

        if (theme === 'custom') {
          if (customColorsControls) customColorsControls.style.display = 'inline-flex';
          if (customThemeToggle) customThemeToggle.classList.add('is-active');
          if (bgColorInput && customColors.bg) bgColorInput.value = customColors.bg;
          if (textColorInput && customColors.text) textColorInput.value = customColors.text;
          if (accentColorInput && customColors.accent) accentColorInput.value = customColors.accent;
          applyDynamicTheme(customColors);
        } else {
          if (customColorsControls) customColorsControls.style.display = 'none';
          if (customThemeToggle) customThemeToggle.classList.remove('is-active');
          const presets = (window.Assembler && window.Assembler.THEME_PRESETS) || {};
          const preset = presets[theme];
          if (preset) {
            if (bgColorInput) bgColorInput.value = preset.bg;
            if (textColorInput) textColorInput.value = preset.text;
            if (accentColorInput) accentColorInput.value = preset.accent;
            applyDynamicTheme(preset);
          }
        }

        // Restore viewport
        if (snapshot.viewport) {
          setViewportMode(snapshot.viewport);
        }

        // Update UI and preview frame
        renderStackList();
        updatePreview();
      } finally {
        state.applying = false;
      }
    }

    function undoAction() {
      if (state.index > 0) {
        state.index--;
        applyHistoryState(state.stack[state.index]);
        saveStateToStorage();
        updateHistoryUI();
        showToast('Undo');
      }
    }

    function redoAction() {
      if (state.index < state.stack.length - 1) {
        state.index++;
        applyHistoryState(state.stack[state.index]);
        saveStateToStorage();
        updateHistoryUI();
        showToast('Redo');
      }
    }

    function handleHistoryKeydown(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      if (!isCtrlOrMeta) return;

      const key = (e.key || '').toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoAction();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redoAction();
      }
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', undoAction);
    }
    if (redoBtn) {
      redoBtn.addEventListener('click', redoAction);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleHistoryKeydown);
    }

    return {
      state,
      MAX_HISTORY,
      STORAGE_KEY,
      updateHistoryUI,
      serializeState,
      applyState,
      saveStateToStorage,
      scheduleAutoSave,
      pushHistorySnapshot,
      applyHistoryState,
      undoAction,
      redoAction,
      handleHistoryKeydown
    };
  }

  const api = { createHistory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderHistory = api;
})();
