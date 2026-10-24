/**
 * Undo / redo history and continuous localStorage persistence of the page state.
 * Extracted from builder.js; everything it needs from the builder arrives through `ctx`.
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');
  const { createAutosave } = (typeof window !== 'undefined' && window.BuilderAutosave) || require('./autosave.js');

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
    // label and time of each snapshot, kept beside the snapshot (not inside it, so duplicate detection is unchanged)
    const entryInfo = new WeakMap();
    const Labels = (typeof window !== 'undefined' && window.HistoryLabels) || require('./history-labels.js');

    /** Entries for the History panel, oldest first: { index, label, at, current }. */
    function listHistory() {
      return state.stack.map((snap, index) => {
        const info = entryInfo.get(snap) || { label: index === 0 ? 'Start' : 'Change', at: null };
        return { index, label: info.label, at: info.at, current: index === state.index };
      });
    }

    function jumpToHistory(index) {
      if (index < 0 || index >= state.stack.length || index === state.index) return;
      state.index = index;
      applyHistoryState(state.stack[state.index]);
      saveStateToStorage();
      updateHistoryUI();
    }

    /** Forgets every earlier state; the page as it is now stays (Undo has nothing left to go back to). */
    function clearHistory() {
      const keep = state.stack[state.index];
      if (!keep) return;
      entryInfo.set(keep, { label: 'Start', at: Date.now() });
      state.stack = [keep];
      state.index = 0;
      updateHistoryUI();
    }

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

    // A failed autosave must not pass unnoticed: show a banner until a save works again.
    function showStorageWarning(status) {
      if (typeof document === 'undefined') return;
      let bar = document.getElementById('storageWarning');
      if (status.ok) { if (bar) bar.remove(); return; }
      const why = status.reason === 'full'
        ? 'The browser storage is full, so your latest changes are not being saved.'
        : 'This browser is not letting the builder save, so your latest changes are not being kept (a private window?).';
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'storageWarning';
        bar.setAttribute('role', 'alert');
        bar.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;max-width:min(680px,92vw);padding:10px 14px;border-radius:10px;background:#7a1f1f;color:#fff;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;gap:12px;align-items:center';
        document.body.appendChild(bar);
      }
      bar.innerHTML = '';
      const text = document.createElement('span');
      text.textContent = why + ' Download a copy of your work now.';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Download backup';
      btn.style.cssText = 'flex:none;padding:6px 10px;border-radius:8px;border:0;background:#fff;color:#7a1f1f;font-weight:600;cursor:pointer';
      btn.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(serializeState(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'page-backup.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      bar.append(text, btn);
    }

    const storage = (() => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; } })();
    const autosave = createAutosave({
      storage: storage || { getItem: () => null, setItem: () => { throw new Error('no storage'); }, removeItem: () => {} },
      key: STORAGE_KEY,
      onStatus: showStorageWarning
    });

    function saveStateToStorage() {
      const currentState = serializeState();
      autosave.save(currentState);
      try { if (state.extras) state.extras.onStateSaved(currentState); } catch (err) { console.warn('Project bookkeeping after autosave failed:', err); }
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

      const previous = state.index >= 0 ? state.stack[state.index] : null;
      entryInfo.set(currentSnapshot, { label: Labels.describeChange(previous, currentSnapshot), at: Date.now() });

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
      STORAGE_KEY, autosave,
      updateHistoryUI,
      listHistory,
      jumpToHistory,
      clearHistory,
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
