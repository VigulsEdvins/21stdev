/**
 * Freeform canvas controller: draggable overlay widgets inside sections, the right-click context
 * menu, the element edit toolbar, selection and resize handles, and drag-and-drop of catalogue
 * cards onto the preview. Extracted from builder.js; it owns its selection state (`state`) and
 * receives everything else it needs through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  const CanvasToolbarInputs = (typeof window !== 'undefined' && window.BuilderCanvasToolbarInputs) || require('./canvas-toolbar-inputs.js');
  const CanvasContextMenu = (typeof window !== 'undefined' && window.BuilderCanvasContextMenu) || require('./canvas-context-menu.js');
  const CanvasFrame = (typeof window !== 'undefined' && window.BuilderCanvasFrame) || require('./canvas-frame.js');

  function createCanvasController(ctx) {
    const {
      stackManager, previewFrame, canvasContextMenu, elementEditToolbar,
      addOrReplaceLandingSection, getActiveSection, setActiveSection,
      handleHistoryKeydown, pushHistorySnapshot
    } = ctx;

    // Edit-toolbar controls
    const toolbarTypeBadge = document.getElementById('toolbarTypeBadge');
    const toolbarCloseBtn = document.getElementById('toolbarCloseBtn');
    const toolbarGroupTable = document.getElementById('toolbarGroupTable');
    const toolbarTableTitle = document.getElementById('toolbarTableTitle');
    const toolbarTablePrice = document.getElementById('toolbarTablePrice');
    const toolbarTableWidth = document.getElementById('toolbarTableWidth');
    const toolbarTableHeight = document.getElementById('toolbarTableHeight');
    const toolbarTableFeatures = document.getElementById('toolbarTableFeatures');
    const toolbarTableCtaText = document.getElementById('toolbarTableCtaText');
    const toolbarTableCtaLink = document.getElementById('toolbarTableCtaLink');
    const toolbarGroupCard = document.getElementById('toolbarGroupCard');
    const toolbarCardTitle = document.getElementById('toolbarCardTitle');
    const toolbarCardSubtitle = document.getElementById('toolbarCardSubtitle');
    const toolbarCardWidth = document.getElementById('toolbarCardWidth');
    const toolbarCardHeight = document.getElementById('toolbarCardHeight');
    const toolbarCardDesc = document.getElementById('toolbarCardDesc');
    const toolbarCardBadge = document.getElementById('toolbarCardBadge');
    const toolbarCardLinkText = document.getElementById('toolbarCardLinkText');
    const toolbarGroupButton = document.getElementById('toolbarGroupButton');
    const toolbarBtnText = document.getElementById('toolbarBtnText');
    const toolbarBtnLink = document.getElementById('toolbarBtnLink');
    const toolbarBtnWidth = document.getElementById('toolbarBtnWidth');
    const toolbarBtnHeight = document.getElementById('toolbarBtnHeight');
    const toolbarBtnStylePills = document.getElementById('toolbarBtnStylePills');
    const toolbarGroupImage = document.getElementById('toolbarGroupImage');
    const toolbarImgUrl = document.getElementById('toolbarImgUrl');
    const toolbarImgWidth = document.getElementById('toolbarImgWidth');
    const toolbarImgHeight = document.getElementById('toolbarImgHeight');
    const toolbarImgSizePills = document.getElementById('toolbarImgSizePills');
    const toolbarGroupBadge = document.getElementById('toolbarGroupBadge');
    const toolbarBadgeText = document.getElementById('toolbarBadgeText');
    const toolbarBadgeStylePills = document.getElementById('toolbarBadgeStylePills');
    const toolbarDeleteBtn = document.getElementById('toolbarDeleteBtn');

    // Selection and drag state shared with builder.js (read and written through `state`)
    const cs = { selected: null, pendingElement: null, pendingSection: null, dragPayload: null, activeContext: null };

    // ==========================================================================
    // Freeform Canvas Overlay Elements & Context Menu Controller
    // ==========================================================================
    // Context-menu target { sectionId, xPct, yPct } lives in cs.activeContext

    function hideContextMenu() {
      if (canvasContextMenu) {
        canvasContextMenu.style.display = 'none';
      }
      cs.activeContext = null;
    }

    function closeToolbarPopup() {
      if (elementEditToolbar) {
        elementEditToolbar.style.display = 'none';
      }
    }

    function clearElementSelection() {
      closeToolbarPopup();
      cs.selected = null;
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          doc.querySelectorAll('.canvas-element.is-selected').forEach(el => el.classList.remove('is-selected'));
        }
      } catch (_) {}
    }

    function hideEditToolbar() {
      clearElementSelection();
    }

    function selectCanvasElement(sectionId, elementId, showHandles = true) {
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (!doc) return;
        doc.querySelectorAll('.canvas-element.is-selected').forEach(el => el.classList.remove('is-selected'));
        const el = doc.getElementById(elementId);
        if (el) {
          el.classList.add('is-selected');
          if (showHandles) ensureResizeHandles(el);
          const elements = stackManager.getSectionElements(sectionId);
          const elData = elements.find(e => e.id === elementId);
          cs.selected = { sectionId, elementId, type: elData ? elData.type : 'button' };
        }
      } catch (_) {}
    }

    function updateToolbarPosition() {
      if (!cs.selected || !elementEditToolbar || elementEditToolbar.style.display === 'none') return;
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (!doc) return;
        const el = doc.getElementById(cs.selected.elementId);
        if (!el) {
          closeToolbarPopup();
          return;
        }
        const elRect = el.getBoundingClientRect();
        const frameRect = previewFrame.getBoundingClientRect();

        // Place the toolbar where it does not cover the widget being edited: above, below, then to a side
        const tbW = elementEditToolbar.offsetWidth || 280;
        const tbH = elementEditToolbar.offsetHeight || 240;
        const gap = 12;
        const elTop = frameRect.top + elRect.top;
        const elBottom = frameRect.top + elRect.bottom;
        const elLeft = frameRect.left + elRect.left;
        const elRight = frameRect.left + elRect.right;
        const minTop = 70;
        const maxBottom = window.innerHeight - 10;
        const centred = elLeft + elRect.width / 2 - tbW / 2;
        const fits = (l, t) => l >= 10 && t >= minTop && l + tbW <= window.innerWidth - 10 && t + tbH <= maxBottom;
        const options = [
          [centred, elTop - tbH - gap],
          [centred, elBottom + gap],
          [elRight + gap, elTop],
          [elLeft - tbW - gap, elTop]
        ];
        const chosen = options.find(([l, t]) => fits(l, t)) || options[1];
        const clampedLeft = Math.max(10, Math.min(window.innerWidth - tbW - 10, chosen[0]));
        const clampedTop = Math.max(minTop, Math.min(maxBottom - tbH, chosen[1]));

        elementEditToolbar.style.left = `${clampedLeft}px`;
        elementEditToolbar.style.top = `${clampedTop}px`;
      } catch (_) {}
    }

    function ensureResizeHandles(elementEl) {
      if (!elementEl || elementEl.querySelector('.el-resize-handle')) return;
      const positions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      positions.forEach(pos => {
        const handle = elementEl.ownerDocument.createElement('div');
        handle.className = `el-resize-handle handle-${pos}`;
        handle.dataset.handle = pos;
        elementEl.appendChild(handle);
      });
    }

    function openEditToolbar(sectionId, elementId) {
      const elements = stackManager.getSectionElements(sectionId);
      const elData = elements.find(e => e.id === elementId);
      if (!elData) return;

      selectCanvasElement(sectionId, elementId, true);
      if (toolbarTypeBadge) {
        toolbarTypeBadge.textContent = elData.type.toUpperCase();
      }

      if (toolbarGroupTable) toolbarGroupTable.style.display = elData.type === 'table' ? 'flex' : 'none';
      if (toolbarGroupCard) toolbarGroupCard.style.display = (elData.type === 'card' || elData.type === 'file-card' || elData.type === 'folder-card') ? 'flex' : 'none';
      if (toolbarGroupButton) toolbarGroupButton.style.display = elData.type === 'button' ? 'flex' : 'none';
      if (toolbarGroupImage) toolbarGroupImage.style.display = elData.type === 'image' ? 'flex' : 'none';
      if (toolbarGroupBadge) toolbarGroupBadge.style.display = elData.type === 'badge' ? 'flex' : 'none';

      // Measure current rendered element dimensions if not explicitly set
      let curWidth = (elData.width !== undefined && elData.width !== null) ? parseInt(elData.width, 10) : '';
      let curHeight = (elData.height !== undefined && elData.height !== null) ? parseInt(elData.height, 10) : '';
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          const el = doc.getElementById(elementId);
          if (el) {
            ensureResizeHandles(el);
            const r = el.getBoundingClientRect();
            if (!curWidth) curWidth = Math.round(r.width);
            if (!curHeight) curHeight = Math.round(r.height);
          }
        }
      } catch (_) {}

      if (toolbarTableWidth) toolbarTableWidth.value = curWidth || '';
      if (toolbarTableHeight) toolbarTableHeight.value = curHeight || '';
      if (toolbarCardWidth) toolbarCardWidth.value = curWidth || '';
      if (toolbarCardHeight) toolbarCardHeight.value = curHeight || '';
      if (toolbarBtnWidth) toolbarBtnWidth.value = curWidth || '';
      if (toolbarBtnHeight) toolbarBtnHeight.value = curHeight || '';
      if (toolbarImgWidth) toolbarImgWidth.value = curWidth || '';
      if (toolbarImgHeight) toolbarImgHeight.value = curHeight || '';

      if (elData.type === 'table') {
        if (toolbarTableTitle) toolbarTableTitle.value = elData.title || '';
        if (toolbarTablePrice) toolbarTablePrice.value = elData.price || '';
        if (toolbarTableFeatures) toolbarTableFeatures.value = Array.isArray(elData.features) ? elData.features.join('\n') : '';
        if (toolbarTableCtaText) toolbarTableCtaText.value = elData.ctaText || 'Get Started';
        if (toolbarTableCtaLink) toolbarTableCtaLink.value = elData.ctaLink || '#';
      } else if (elData.type === 'card' || elData.type === 'file-card' || elData.type === 'folder-card') {
        if (toolbarCardTitle) toolbarCardTitle.value = elData.title || elData.fileName || elData.label || '';
        if (toolbarCardSubtitle) toolbarCardSubtitle.value = elData.subtitle || elData.author || elData.fileSize || elData.itemCount || '';
        if (toolbarCardDesc) toolbarCardDesc.value = elData.description || '';
        if (toolbarCardBadge) toolbarCardBadge.value = elData.badgeText || elData.badge || '';
        if (toolbarCardLinkText) toolbarCardLinkText.value = elData.ctaText || 'Learn More →';
      } else if (elData.type === 'button') {
        if (toolbarBtnText) toolbarBtnText.value = elData.text || '';
        if (toolbarBtnLink) toolbarBtnLink.value = elData.link || '#';
        if (toolbarBtnStylePills) {
          toolbarBtnStylePills.querySelectorAll('.style-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.style === (elData.style || 'solid'));
          });
        }
      } else if (elData.type === 'image') {
        if (toolbarImgUrl) toolbarImgUrl.value = elData.imageUrl || '';
        if (toolbarImgSizePills) {
          toolbarImgSizePills.querySelectorAll('.size-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.size === (elData.imageSize || 'medium'));
          });
        }
      } else if (elData.type === 'badge') {
        if (toolbarBadgeText) toolbarBadgeText.value = elData.text || '';
        if (toolbarBadgeStylePills) {
          toolbarBadgeStylePills.querySelectorAll('.style-pill').forEach(pill => {
            pill.classList.toggle('is-active', pill.dataset.style === (elData.badgeStyle || elData.style || 'pulse'));
          });
        }
      }

      elementEditToolbar.style.display = 'flex';
      updateToolbarPosition();
    }

    function focusElementPrimaryText(sectionId, elementId) {
      if (!sectionId || !elementId) return;
      openEditToolbar(sectionId, elementId);

      const elements = stackManager.getSectionElements(sectionId);
      const elData = elements.find(e => e.id === elementId);
      const elType = elData ? elData.type : (cs.selected ? cs.selected.type : null);

      setTimeout(() => {
        let inputToFocus = null;
        if (elType === 'button') {
          inputToFocus = toolbarBtnText;
        } else if (elType === 'card' || elType === 'file-card' || elType === 'folder-card') {
          inputToFocus = toolbarCardTitle;
        } else if (elType === 'table') {
          inputToFocus = toolbarTableTitle;
        } else if (elType === 'badge') {
          inputToFocus = toolbarBadgeText;
        } else if (elType === 'image') {
          inputToFocus = toolbarImgUrl;
        } else {
          inputToFocus = toolbarCardTitle || toolbarBtnText;
        }

        if (inputToFocus) {
          inputToFocus.focus();
          if (typeof inputToFocus.select === 'function') {
            inputToFocus.select();
          }
        }
      }, 50);

      // Brief visual focus ring on canvas element in preview frame
      try {
        const doc = previewFrame && (previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document));
        if (doc) {
          const el = doc.getElementById(elementId);
          if (el) {
            doc.querySelectorAll('.canvas-element.is-selected').forEach(e => e.classList.remove('is-selected'));
            el.classList.add('is-selected');
            ensureResizeHandles(el);
            el.style.outline = '2px solid #a855f7';
            el.style.outlineOffset = '2px';
            setTimeout(() => {
              el.style.outline = '';
              el.style.outlineOffset = '';
            }, 1200);
          }
        }
      } catch (_) {}

      showToast('Editing element text');
    }

    CanvasToolbarInputs.wire({ toolbarCloseBtn, hideEditToolbar, toolbarTableTitle, cs, stackManager, previewFrame, toolbarTablePrice, toolbarTableFeatures, toolbarTableCtaText, toolbarTableCtaLink, toolbarCardTitle, toolbarCardSubtitle, toolbarCardDesc, toolbarCardBadge, toolbarBtnText, toolbarBtnLink, toolbarBtnStylePills, toolbarImgUrl, toolbarImgSizePills, updateToolbarPosition, toolbarBadgeText, toolbarBadgeStylePills, toolbarTableWidth, toolbarTableHeight, toolbarCardWidth, toolbarCardHeight, toolbarBtnWidth, toolbarBtnHeight, toolbarImgWidth, toolbarImgHeight, toolbarDeleteBtn });
    CanvasContextMenu.wire({ canvasContextMenu, hideContextMenu, cs, stackManager, focusElementPrimaryText, openEditToolbar, toolbarBtnWidth, toolbarImgWidth, toolbarCardWidth, toolbarTableWidth, pushHistorySnapshot, clearElementSelection });

    function handleCanvasElementKeydown(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && cs.selected) {
        const { sectionId, elementId } = cs.selected;
        const elements = stackManager.getSectionElements(sectionId);
        if (elements && elements.some(el => el.id === elementId)) {
          e.preventDefault();
          pushHistorySnapshot();
          stackManager.removeElement(sectionId, elementId);
          clearElementSelection();
          showToast('Element deleted');
        }
      }
    }

    // Global click, window resize, and keydown listeners
    window.addEventListener('click', (e) => {
      if (canvasContextMenu && !canvasContextMenu.contains(e.target)) {
        hideContextMenu();
      }
    });

    window.addEventListener('resize', updateToolbarPosition);
    window.addEventListener('scroll', updateToolbarPosition, true);
    window.addEventListener('keydown', handleCanvasElementKeydown);

    CanvasFrame.wire({ previewFrame, handleHistoryKeydown, handleCanvasElementKeydown, cs, selectCanvasElement, closeToolbarPopup, ensureResizeHandles, elementEditToolbar, updateToolbarPosition, clearElementSelection, canvasContextMenu, hideContextMenu, focusElementPrimaryText, pushHistorySnapshot, toolbarBtnWidth, toolbarBtnHeight, toolbarImgWidth, toolbarImgHeight, toolbarCardWidth, toolbarCardHeight, toolbarTableWidth, toolbarTableHeight, stackManager, getActiveSection, setActiveSection, addOrReplaceLandingSection });
    return {
      state: cs,
      hideContextMenu,
      closeToolbarPopup,
      clearElementSelection,
      selectCanvasElement,
      updateToolbarPosition,
      ensureResizeHandles
    };
  }

  const api = { createCanvasController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderCanvas = api;
})();
