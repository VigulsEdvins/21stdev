/**
 * Freeform canvas controller: draggable overlay widgets inside sections, the right-click context
 * menu, the element edit toolbar, selection and resize handles, and drag-and-drop of catalogue
 * cards onto the preview. Extracted from builder.js; it owns its selection state (`state`) and
 * receives everything else it needs through `ctx`.
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

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
    const cs = { selected: null, pendingElement: null, pendingSection: null, dragPayload: null };

    // ==========================================================================
    // Freeform Canvas Overlay Elements & Context Menu Controller
    // ==========================================================================
    let activeCanvasContext = null; // { sectionId, xPct, yPct }

    function hideContextMenu() {
      if (canvasContextMenu) {
        canvasContextMenu.style.display = 'none';
      }
      activeCanvasContext = null;
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

        const left = frameRect.left + elRect.left + (elRect.width / 2) - 140;
        let top = frameRect.top + elRect.top - 240;

        if (top < 70) {
          top = frameRect.top + elRect.bottom + 20;
        }

        const clampedLeft = Math.max(10, Math.min(window.innerWidth - 300, left));
        const clampedTop = Math.max(70, Math.min(window.innerHeight - 260, top));

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

    // Toolbar Input Event Listeners
    if (toolbarCloseBtn) {
      toolbarCloseBtn.addEventListener('click', hideEditToolbar);
    }

    // Table Toolbar Inputs
    if (toolbarTableTitle) {
      toolbarTableTitle.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { title: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const titleEl = el.querySelector('.pricing-card-title');
            if (titleEl) titleEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTablePrice) {
      toolbarTablePrice.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { price: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const priceEl = el.querySelector('.pricing-card-price');
            if (priceEl) priceEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTableFeatures) {
      toolbarTableFeatures.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const features = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { features }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const listEl = el.querySelector('.pricing-card-features');
            if (listEl) {
              listEl.innerHTML = features.map(f => `<li><span class="feature-check">✓</span> ${escapeHtml(f)}</li>`).join('');
            }
          }
        } catch (_) {}
      });
    }

    if (toolbarTableCtaText) {
      toolbarTableCtaText.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { ctaText: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const ctaEl = el.querySelector('.pricing-card-cta');
            if (ctaEl) ctaEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarTableCtaLink) {
      toolbarTableCtaLink.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { ctaLink: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const ctaEl = el.querySelector('.pricing-card-cta');
            if (ctaEl) ctaEl.href = val;
          }
        } catch (_) {}
      });
    }

    // Card Toolbar Inputs
    if (toolbarCardTitle) {
      toolbarCardTitle.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        const updates = { title: val, fileName: val, label: val };
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const titleEl = el.querySelector('.feature-card-title') ||
                            el.querySelector('.testimonial-name') ||
                            el.querySelector('.file-card-name') ||
                            el.querySelector('.folder-label');
            if (titleEl) {
              titleEl.textContent = val;
              if (titleEl.hasAttribute('title')) titleEl.setAttribute('title', val);
            }
          }
        } catch (_) {}
      });
    }

    if (toolbarCardSubtitle) {
      toolbarCardSubtitle.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        const updates = { subtitle: val, author: val, fileSize: val, itemCount: val };
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const subEl = el.querySelector('.feature-card-subtitle') ||
                          el.querySelector('.testimonial-role') ||
                          el.querySelector('.file-card-size') ||
                          el.querySelector('.folder-item-count');
            if (subEl) subEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarCardDesc) {
      toolbarCardDesc.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { description: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const descEl = el.querySelector('.feature-card-desc') || el.querySelector('.testimonial-quote');
            if (descEl) descEl.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarCardBadge) {
      toolbarCardBadge.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        const updates = { badgeText: val, badge: val };
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            let badgeEl = el.querySelector('.card-badge') ||
                          el.querySelector('.file-badge') ||
                          el.querySelector('.folder-tab-badge');
            if (!badgeEl && val) {
              const header = el.querySelector('.feature-card-header');
              if (header) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'card-badge';
                header.appendChild(badgeEl);
              }
            }
            if (badgeEl) {
              badgeEl.textContent = val;
              badgeEl.style.display = val ? '' : 'none';
            }
          }
        } catch (_) {}
      });
    }

    // Button Toolbar Inputs
    if (toolbarBtnText) {
      toolbarBtnText.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { text: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const link = el.querySelector('.canvas-btn-link .btn-label') || el.querySelector('.canvas-btn-link');
            if (link) link.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBtnLink) {
      toolbarBtnLink.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { link: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const link = el.querySelector('.canvas-btn-link');
            if (link) link.href = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBtnStylePills) {
      toolbarBtnStylePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill || !cs.selected) return;
        const style = pill.dataset.style;
        toolbarBtnStylePills.querySelectorAll('.style-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { style }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            el.className = el.className.replace(/btn-style-[a-z]+/g, '').trim() + ` btn-style-${style}`;
          }
        } catch (_) {}
      });
    }

    if (toolbarImgUrl) {
      toolbarImgUrl.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { imageUrl: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const img = el.querySelector('img');
            if (img) img.src = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarImgSizePills) {
      toolbarImgSizePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.size-pill');
        if (!pill || !cs.selected) return;
        const size = pill.dataset.size;
        toolbarImgSizePills.querySelectorAll('.size-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { imageSize: size }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            el.className = el.className.replace(/img-size-[a-z]+/g, '').trim() + ` img-size-${size}`;
          }
        } catch (_) {}
        updateToolbarPosition();
      });
    }

    if (toolbarBadgeText) {
      toolbarBadgeText.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = e.target.value;
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { text: val }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            const badgeSpan = el.querySelector('.badge-text');
            if (badgeSpan) badgeSpan.textContent = val;
          }
        } catch (_) {}
      });
    }

    if (toolbarBadgeStylePills) {
      toolbarBadgeStylePills.addEventListener('click', (e) => {
        const pill = e.target.closest('.style-pill');
        if (!pill || !cs.selected) return;
        const style = pill.dataset.style;
        toolbarBadgeStylePills.querySelectorAll('.style-pill').forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');

        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, { badgeStyle: style }, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            el.className = el.className.replace(/badge-style-[a-z]+/g, '').trim() + ` badge-style-${style}`;
          }
        } catch (_) {}
      });
    }

    // Wire Width and Height dimension input listeners
    function wireDimensionInput(inputEl, property) {
      if (!inputEl) return;
      inputEl.addEventListener('input', (e) => {
        if (!cs.selected) return;
        const val = parseInt(e.target.value, 10);
        const minVal = property === 'width' ? 30 : 20;
        const updates = {};
        if (!isNaN(val) && val > 0) {
          updates[property] = Math.max(minVal, val);
        } else {
          updates[property] = undefined;
        }
        stackManager.updateElement(cs.selected.sectionId, cs.selected.elementId, updates, true);
        try {
          const doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            if (updates[property]) {
              el.style[property] = `${updates[property]}px`;
            } else {
              el.style[property] = '';
            }
          }
        } catch (_) {}
        updateToolbarPosition();
      });
    }

    wireDimensionInput(toolbarTableWidth, 'width');
    wireDimensionInput(toolbarTableHeight, 'height');
    wireDimensionInput(toolbarCardWidth, 'width');
    wireDimensionInput(toolbarCardHeight, 'height');
    wireDimensionInput(toolbarBtnWidth, 'width');
    wireDimensionInput(toolbarBtnHeight, 'height');
    wireDimensionInput(toolbarImgWidth, 'width');
    wireDimensionInput(toolbarImgHeight, 'height');

    if (toolbarDeleteBtn) {
      toolbarDeleteBtn.addEventListener('click', () => {
        if (!cs.selected) return;
        const { sectionId, elementId } = cs.selected;
        stackManager.removeElement(sectionId, elementId);
        hideEditToolbar();
        showToast('Element removed');
      });
    }

    // Context Menu Action Listeners
    if (canvasContextMenu) {
      canvasContextMenu.addEventListener('click', (e) => {
        const itemBtn = e.target.closest('.context-menu-item');
        if (!itemBtn) return;
        const action = itemBtn.dataset.action;

        if (action === 'edit-text') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (cs.selected && cs.selected.sectionId);
          let targetElementId = cs.selected ? cs.selected.elementId : null;
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            focusElementPrimaryText(targetSectionId, targetElementId);
          }
          return;
        }

        if (action === 'resize-element') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (cs.selected && cs.selected.sectionId);
          let targetElementId = (activeCanvasContext && activeCanvasContext.elementId) || (cs.selected ? cs.selected.elementId : null);
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            openEditToolbar(targetSectionId, targetElementId);
            setTimeout(() => {
              const elType = cs.selected ? cs.selected.type : null;
              if (elType === 'button' && toolbarBtnWidth) toolbarBtnWidth.focus();
              else if (elType === 'image' && toolbarImgWidth) toolbarImgWidth.focus();
              else if (elType === 'card' && toolbarCardWidth) toolbarCardWidth.focus();
              else if (elType === 'table' && toolbarTableWidth) toolbarTableWidth.focus();
              else if (toolbarBtnWidth) toolbarBtnWidth.focus();
            }, 60);
          }
          return;
        }

        if (action === 'duplicate-element') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (cs.selected && cs.selected.sectionId);
          let targetElementId = (activeCanvasContext && activeCanvasContext.elementId) || (cs.selected ? cs.selected.elementId : null);
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            const orig = elements.find(el => el.id === targetElementId);
            if (orig) {
              pushHistorySnapshot();
              const clone = JSON.parse(JSON.stringify(orig));
              delete clone.id;
              clone.x = Math.min(96, (clone.x || 50) + 3);
              clone.y = Math.min(96, (clone.y || 50) + 3);
              const newEl = stackManager.addElement(targetSectionId, clone);
              if (newEl) {
                cs.pendingElement = { sectionId: targetSectionId, elementId: newEl.id };
                showToast(`Duplicated ${newEl.type || 'element'}`);
              }
            }
          }
          return;
        }

        if (action === 'delete-element') {
          hideContextMenu();
          const targetSectionId = (activeCanvasContext && activeCanvasContext.sectionId) || (cs.selected && cs.selected.sectionId);
          let targetElementId = (activeCanvasContext && activeCanvasContext.elementId) || (cs.selected ? cs.selected.elementId : null);
          if (!targetElementId && targetSectionId) {
            const elements = stackManager.getSectionElements(targetSectionId);
            if (elements.length > 0) targetElementId = elements[elements.length - 1].id;
          }
          if (targetSectionId && targetElementId) {
            pushHistorySnapshot();
            stackManager.removeElement(targetSectionId, targetElementId);
            clearElementSelection();
            showToast('Element removed');
          }
          return;
        }

        if (!activeCanvasContext) return;
        let elData = { x: activeCanvasContext.xPct, y: activeCanvasContext.yPct };

        if (action === 'add-table-pricing') {
          elData = {
            ...elData,
            type: 'table',
            tableType: 'pricing',
            title: 'Pro Plan',
            price: '$29/mo',
            features: ['Unlimited Projects', 'Custom Domains', '24/7 Priority Support'],
            ctaText: 'Get Started',
            ctaLink: '#pricing'
          };
        } else if (action === 'add-table-comparison') {
          elData = {
            ...elData,
            type: 'table',
            tableType: 'comparison',
            headers: ['Feature', 'Free', 'Pro'],
            rows: [
              ['Storage', '5 GB', '500 GB'],
              ['Bandwidth', '10 GB/mo', 'Unlimited'],
              ['Support', 'Community', '24/7 Priority']
            ]
          };
        } else if (action === 'add-card-feature') {
          elData = {
            ...elData,
            type: 'card',
            cardType: 'feature',
            title: 'Real-time Analytics',
            description: 'Track conversion rates and user telemetry with sub-millisecond precision.',
            badgeText: 'HOT',
            ctaText: 'Learn More →',
            link: '#features'
          };
        } else if (action === 'add-card-testimonial') {
          elData = {
            ...elData,
            type: 'card',
            cardType: 'testimonial',
            author: 'Sarah Jenkins',
            role: 'VP of Product, Apex Digital',
            avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
            description: 'This platform transformed our landing page conversion rates within 48 hours.',
            rating: 5
          };
        } else if (action === 'add-image') {
          elData = {
            ...elData,
            type: 'image',
            imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80',
            imageSize: 'medium'
          };
        } else if (action === 'add-badge') {
          elData = {
            ...elData,
            type: 'badge',
            text: 'v2.0 LIVE',
            badgeStyle: 'pulse'
          };
        } else {
          elData = {
            ...elData,
            type: 'button',
            text: 'Click Me →',
            style: 'solid'
          };
        }

        const targetSectionId = activeCanvasContext.sectionId;
        const newEl = stackManager.addElement(targetSectionId, elData);

        hideContextMenu();
        if (newEl) {
          cs.pendingElement = { sectionId: targetSectionId, elementId: newEl.id };
          showToast(`Added ${newEl.type} to section`);
        }
      });
    }

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

    // Preview Frame load handler: wire dragging & context menu inside iframe
    if (previewFrame) {
      previewFrame.addEventListener('load', () => {
        let doc;
        try {
          doc = previewFrame.contentDocument || (previewFrame.contentWindow && previewFrame.contentWindow.document);
        } catch (_) {
          return;
        }
        if (!doc) return;

        // Wire history keyboard shortcuts and canvas element deletion inside preview iframe document
        doc.addEventListener('keydown', handleHistoryKeydown);
        doc.addEventListener('keydown', handleCanvasElementKeydown);

        // Auto-select and scroll to pending element (e.g. newly created widget)
        if (cs.pendingElement) {
          const el = doc.getElementById(cs.pendingElement.elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            selectCanvasElement(cs.pendingElement.sectionId, cs.pendingElement.elementId);
            closeToolbarPopup();
          }
          cs.pendingElement = null;
        } else if (cs.pendingSection) {
          const sec = doc.getElementById(cs.pendingSection);
          if (sec) {
            sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
            sec.style.transition = 'box-shadow 0.4s ease';
            sec.style.boxShadow = '0 0 0 3px #a855f7, 0 0 24px rgba(168, 85, 247, 0.5)';
            setTimeout(() => { sec.style.boxShadow = ''; }, 2000);
          }
          cs.pendingSection = null;
        } else if (cs.selected) {
          const el = doc.getElementById(cs.selected.elementId);
          if (el) {
            el.classList.add('is-selected');
            ensureResizeHandles(el);
            if (elementEditToolbar && elementEditToolbar.style.display !== 'none') {
              updateToolbarPosition();
            }
          } else {
            clearElementSelection();
          }
        }

        doc.addEventListener('scroll', updateToolbarPosition, true);

        // Right-Click Context Menu inside Iframe
        doc.addEventListener('contextmenu', (e) => {
          const sectionEl = e.target.closest('.page-section');
          if (!sectionEl) return;

          e.preventDefault();
          const targetEl = e.target.closest('.canvas-element');
          const isElementTarget = !!targetEl;

          if (targetEl) {
            const elId = targetEl.dataset.elementId;
            selectCanvasElement(sectionEl.id, elId);
          } else {
            clearElementSelection();
          }

          const secRect = sectionEl.getBoundingClientRect();
          const xPct = Math.max(2, Math.min(98, ((e.clientX - secRect.left) / secRect.width) * 100));
          const yPct = Math.max(2, Math.min(98, ((e.clientY - secRect.top) / secRect.height) * 100));

          activeCanvasContext = {
            sectionId: sectionEl.id,
            elementId: targetEl ? targetEl.dataset.elementId : null,
            xPct: Math.round(xPct * 10) / 10,
            yPct: Math.round(yPct * 10) / 10
          };

          const contextMenuTitle = document.getElementById('contextMenuTitle');
          const contextElementActionsGroup = document.getElementById('contextElementActionsGroup');
          const contextCanvasAddGroup = document.getElementById('contextCanvasAddGroup');

          if (isElementTarget) {
            if (contextMenuTitle) contextMenuTitle.textContent = 'Element Actions';
            if (contextElementActionsGroup) contextElementActionsGroup.style.display = 'block';
            if (contextCanvasAddGroup) contextCanvasAddGroup.style.display = 'none';
          } else {
            if (contextMenuTitle) contextMenuTitle.textContent = 'Add to Section';
            if (contextElementActionsGroup) contextElementActionsGroup.style.display = 'none';
            if (contextCanvasAddGroup) contextCanvasAddGroup.style.display = 'block';
          }

          const frameRect = previewFrame.getBoundingClientRect();
          const menuLeft = Math.min(window.innerWidth - 220, frameRect.left + e.clientX);
          const menuTop = Math.min(window.innerHeight - 240, frameRect.top + e.clientY);

          if (canvasContextMenu) {
            canvasContextMenu.style.left = `${menuLeft}px`;
            canvasContextMenu.style.top = `${menuTop}px`;
            canvasContextMenu.style.display = 'block';
          }
        });

        // Click inside iframe
        doc.addEventListener('click', (e) => {
          hideContextMenu();
          const elementEl = e.target.closest('.canvas-element');
          if (elementEl) {
            e.preventDefault();
          } else {
            clearElementSelection();
          }
        });

        // Double-click on canvas element for instant direct text editing
        doc.addEventListener('dblclick', (e) => {
          const elementEl = e.target.closest('.canvas-element');
          if (!elementEl) return;
          e.preventDefault();
          e.stopPropagation();

          const elementId = elementEl.dataset.elementId;
          const sectionEl = elementEl.closest('.page-section');
          if (!sectionEl || !elementId) return;

          focusElementPrimaryText(sectionEl.id, elementId);
        });

        // Canvas Element Mousedown Handler: Resize Handles & Dragging
        doc.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;

          // 1. Live Interactive Resize Handles for Canvas Elements
          const resizeHandleEl = e.target.closest('.el-resize-handle');
          if (resizeHandleEl) {
            pushHistorySnapshot();
            e.preventDefault();
            e.stopPropagation();

            const elementEl = resizeHandleEl.closest('.canvas-element');
            if (!elementEl) return;
            const elementId = elementEl.dataset.elementId;
            const sectionEl = elementEl.closest('.page-section');
            if (!sectionEl) return;
            const sectionId = sectionEl.id;

            selectCanvasElement(sectionId, elementId);
            closeToolbarPopup();

            const handleType = resizeHandleEl.dataset.handle;
            const elRect = elementEl.getBoundingClientRect();
            const secRect = sectionEl.getBoundingClientRect();

            const initialBox = {
              left: elRect.left - secRect.left,
              top: elRect.top - secRect.top,
              right: elRect.right - secRect.left,
              bottom: elRect.bottom - secRect.top,
              width: elRect.width,
              height: elRect.height
            };
            const startMouseX = e.clientX;
            const startMouseY = e.clientY;

            let finalWidth = initialBox.width;
            let finalHeight = initialBox.height;
            let finalXPct = parseFloat(elementEl.style.left) || 50;
            let finalYPct = parseFloat(elementEl.style.top) || 50;

            function onElementResizeMove(moveEvent) {
              const frameRect = previewFrame.getBoundingClientRect();
              const mouseX = (moveEvent.view === window) ? (moveEvent.clientX - frameRect.left) : moveEvent.clientX;
              const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;

              const deltaX = mouseX - startMouseX;
              const deltaY = mouseY - startMouseY;

              let newWidth = initialBox.width;
              let newHeight = initialBox.height;
              let newCenterX = initialBox.left + initialBox.width / 2;
              let newCenterY = initialBox.top + initialBox.height / 2;

              if (handleType.includes('e')) {
                newWidth = Math.max(30, initialBox.width + deltaX);
                newCenterX = initialBox.left + (newWidth / 2);
              } else if (handleType.includes('w')) {
                newWidth = Math.max(30, initialBox.width - deltaX);
                newCenterX = initialBox.right - (newWidth / 2);
              }

              if (handleType.includes('s')) {
                newHeight = Math.max(20, initialBox.height + deltaY);
                newCenterY = initialBox.top + (newHeight / 2);
              } else if (handleType.includes('n')) {
                newHeight = Math.max(20, initialBox.height - deltaY);
                newCenterY = initialBox.bottom - (newHeight / 2);
              }

              finalWidth = Math.round(newWidth);
              finalHeight = Math.round(newHeight);
              finalXPct = Math.max(2, Math.min(98, Math.round(((newCenterX / secRect.width) * 100) * 10) / 10));
              finalYPct = Math.max(2, Math.min(98, Math.round(((newCenterY / secRect.height) * 100) * 10) / 10));

              elementEl.style.width = `${finalWidth}px`;
              elementEl.style.height = `${finalHeight}px`;
              elementEl.style.left = `${finalXPct}%`;
              elementEl.style.top = `${finalYPct}%`;

              if (toolbarBtnWidth) toolbarBtnWidth.value = finalWidth;
              if (toolbarBtnHeight) toolbarBtnHeight.value = finalHeight;
              if (toolbarImgWidth) toolbarImgWidth.value = finalWidth;
              if (toolbarImgHeight) toolbarImgHeight.value = finalHeight;
              if (toolbarCardWidth) toolbarCardWidth.value = finalWidth;
              if (toolbarCardHeight) toolbarCardHeight.value = finalHeight;
              if (toolbarTableWidth) toolbarTableWidth.value = finalWidth;
              if (toolbarTableHeight) toolbarTableHeight.value = finalHeight;

              stackManager.updateElement(sectionId, elementId, {
                width: finalWidth,
                height: finalHeight,
                x: finalXPct,
                y: finalYPct
              }, true);

              if (elementEditToolbar && elementEditToolbar.style.display !== 'none') {
                updateToolbarPosition();
              }
            }

            function onElementResizeUp() {
              doc.removeEventListener('mousemove', onElementResizeMove);
              doc.removeEventListener('mouseup', onElementResizeUp);
              window.removeEventListener('mousemove', onElementResizeMove);
              window.removeEventListener('mouseup', onElementResizeUp);

              stackManager.updateElement(sectionId, elementId, {
                width: finalWidth,
                height: finalHeight,
                x: finalXPct,
                y: finalYPct
              }, false);
              if (elementEditToolbar && elementEditToolbar.style.display !== 'none') {
                updateToolbarPosition();
              }
            }

            doc.addEventListener('mousemove', onElementResizeMove);
            doc.addEventListener('mouseup', onElementResizeUp);
            window.addEventListener('mousemove', onElementResizeMove);
            window.addEventListener('mouseup', onElementResizeUp);
            return;
          }

          // 2. Element Dragging & Selection
          const elementEl = e.target.closest('.canvas-element');
          if (!elementEl) return;

          e.preventDefault();
          const elementId = elementEl.dataset.elementId;
          const sectionEl = elementEl.closest('.page-section');
          if (!sectionEl) return;
          const sectionId = sectionEl.id;

          if (e.detail === 2) {
            e.stopPropagation();
            focusElementPrimaryText(sectionId, elementId);
            return;
          }

          selectCanvasElement(sectionId, elementId);
          closeToolbarPopup();

          pushHistorySnapshot();
          let isDragging = false;
          const startX = e.clientX;
          const startY = e.clientY;
          const secRect = sectionEl.getBoundingClientRect();

          const startXPct = parseFloat(elementEl.style.left) || 50;
          const startYPct = parseFloat(elementEl.style.top) || 50;
          let currentXPct = startXPct;
          let currentYPct = startYPct;

          function onMouseMove(moveEvent) {
            const frameRect = previewFrame.getBoundingClientRect();
            const mouseX = (moveEvent.view === window) ? (moveEvent.clientX - frameRect.left) : moveEvent.clientX;
            const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;

            const deltaX = mouseX - startX;
            const deltaY = mouseY - startY;

            if (!isDragging && Math.hypot(deltaX, deltaY) > 3) {
              isDragging = true;
            }

            if (isDragging) {
              currentXPct = Math.max(2, Math.min(98, startXPct + (deltaX / secRect.width) * 100));
              currentYPct = Math.max(2, Math.min(98, startYPct + (deltaY / secRect.height) * 100));

              elementEl.style.left = `${currentXPct}%`;
              elementEl.style.top = `${currentYPct}%`;
              updateToolbarPosition();
            }
          }

          function onMouseUp() {
            doc.removeEventListener('mousemove', onMouseMove);
            doc.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            if (isDragging) {
              stackManager.updateElement(sectionId, elementId, {
                x: Math.round(currentXPct * 10) / 10,
                y: Math.round(currentYPct * 10) / 10
              }, false);
            }
          }

          doc.addEventListener('mousemove', onMouseMove);
          doc.addEventListener('mouseup', onMouseUp);
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });

        // Section Bottom Resize Handle Drag Handler
        doc.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          const handleEl = e.target.closest('.section-resize-handle');
          if (!handleEl) return;

          e.preventDefault();
          pushHistorySnapshot();
          const sectionId = handleEl.dataset.resizeSection;
          const sectionEl = doc.getElementById(sectionId);
          if (!sectionEl) return;

          handleEl.classList.add('is-resizing');
          const startY = e.clientY;
          const initialHeight = sectionEl.getBoundingClientRect().height;
          let newHeight = initialHeight;

          // Prepare section & children for live stretching without blank gaps
          sectionEl.style.display = 'flex';
          sectionEl.style.flexDirection = 'column';
          const contentEl = sectionEl.querySelector(':scope > div[id^="root-"], :scope > :first-child:not(.section-overlay-layer):not(.section-resize-handle)');
          if (contentEl) {
            contentEl.style.flex = '1 1 auto';
            contentEl.style.height = '100%';
            contentEl.style.minHeight = '100%';
            if (contentEl.firstElementChild) {
              contentEl.firstElementChild.style.flex = '1 1 auto';
              contentEl.firstElementChild.style.height = '100%';
              contentEl.firstElementChild.style.minHeight = '100%';
            }
          }

          function onSectionResizeMove(moveEvent) {
            const frameRect = previewFrame.getBoundingClientRect();
            const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;
            const deltaY = mouseY - startY;
            newHeight = Math.max(48, Math.min(2600, Math.round(initialHeight + deltaY)));
            sectionEl.style.height = `${newHeight}px`;
            sectionEl.style.minHeight = `${newHeight}px`;
            sectionEl.style.overflow = 'hidden';

            // Show live height floating tooltip inside the iframe
            let sizeTooltip = doc.getElementById('sectionResizeTooltip');
            if (!sizeTooltip) {
              sizeTooltip = doc.createElement('div');
              sizeTooltip.id = 'sectionResizeTooltip';
              sizeTooltip.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,15,22,0.92);color:#fafafa;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;font-family:monospace;border:1px solid rgba(168,85,247,0.5);box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:99999;pointer-events:none;';
              doc.body.appendChild(sizeTooltip);
            }
            sizeTooltip.textContent = `Section Height: ${newHeight}px`;
            sizeTooltip.style.display = 'block';

            updateToolbarPosition();
          }

          function onSectionResizeUp() {
            handleEl.classList.remove('is-resizing');
            doc.removeEventListener('mousemove', onSectionResizeMove);
            doc.removeEventListener('mouseup', onSectionResizeUp);
            window.removeEventListener('mousemove', onSectionResizeMove);
            window.removeEventListener('mouseup', onSectionResizeUp);

            const sizeTooltip = doc.getElementById('sectionResizeTooltip');
            if (sizeTooltip) sizeTooltip.style.display = 'none';

            stackManager.updateSectionSizing(sectionId, {
              heightMode: 'custom',
              customHeight: newHeight
            });
            showToast(`Section height updated: ${newHeight}px`);
          }

          doc.addEventListener('mousemove', onSectionResizeMove);
          doc.addEventListener('mouseup', onSectionResizeUp);
          window.addEventListener('mousemove', onSectionResizeMove);
          window.addEventListener('mouseup', onSectionResizeUp);
        });

        // =============================================================
        // Drag-and-Drop from Sidebar onto Canvas & Positional Section Dropping
        // =============================================================
        let dropIndicatorEl = null;

        function cleanupDropIndicators() {
          doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => sec.classList.remove('is-drop-target'));
          if (dropIndicatorEl) {
            dropIndicatorEl.remove();
            dropIndicatorEl = null;
          }
          doc.querySelectorAll('.section-drop-indicator').forEach(el => el.remove());
        }

        doc.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'copy';
          }

          const targetSection = e.target.closest('.page-section');
          const isWidget = cs.dragPayload ? cs.dragPayload.isWidget : false;

          if (isWidget) {
            if (dropIndicatorEl) {
              dropIndicatorEl.remove();
              dropIndicatorEl = null;
            }
            doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => {
              if (sec !== targetSection) sec.classList.remove('is-drop-target');
            });
            if (targetSection) {
              targetSection.classList.add('is-drop-target');
            }
          } else {
            doc.querySelectorAll('.page-section.is-drop-target').forEach(sec => sec.classList.remove('is-drop-target'));

            if (targetSection) {
              const secRect = targetSection.getBoundingClientRect();
              const isUpper = (e.clientY - secRect.top) < (secRect.height / 2);

              if (!dropIndicatorEl || dropIndicatorEl.parentElement !== targetSection) {
                if (dropIndicatorEl) dropIndicatorEl.remove();
                dropIndicatorEl = doc.createElement('div');
                dropIndicatorEl.className = 'section-drop-indicator';
                targetSection.appendChild(dropIndicatorEl);
              }

              if (isUpper) {
                dropIndicatorEl.classList.remove('drop-below');
                dropIndicatorEl.classList.add('drop-above');
              } else {
                dropIndicatorEl.classList.remove('drop-above');
                dropIndicatorEl.classList.add('drop-below');
              }
            } else {
              if (dropIndicatorEl) {
                dropIndicatorEl.remove();
                dropIndicatorEl = null;
              }
            }
          }
        });

        doc.addEventListener('dragleave', (e) => {
          if (!e.relatedTarget || e.relatedTarget === doc.documentElement || e.relatedTarget === doc.body || !doc.contains(e.relatedTarget)) {
            cleanupDropIndicators();
          }
        });

        doc.addEventListener('drop', (e) => {
          e.preventDefault();

          let payload = null;
          try {
            const rawData = e.dataTransfer && e.dataTransfer.getData('application/json');
            if (rawData) {
              payload = JSON.parse(rawData);
            }
          } catch (_) {}

          if (!payload && e.dataTransfer) {
            try {
              const rawText = e.dataTransfer.getData('text/plain');
              if (rawText) {
                payload = JSON.parse(rawText);
              }
            } catch (_) {}
          }

          if (!payload && cs.dragPayload) {
            payload = cs.dragPayload;
          }

          cleanupDropIndicators();

          if (!payload) return;

          const targetSection = e.target.closest('.page-section');

          if (payload.isWidget) {
            let sec = targetSection;
            if (!sec) {
              const active = getActiveSection();
              if (active) {
                sec = doc.getElementById(active.id);
              }
            }

            if (!sec) {
              const newSec = stackManager.addSection('oklch-ambient-glow-hero', {
                title: 'Hero Section',
                category: 'Heroes'
              });
              setActiveSection(newSec.id);
              const newEl = stackManager.addElement(newSec.id, {
                ...(payload.elData || {}),
                x: 50,
                y: 50
              });
              if (newEl) {
                cs.pendingElement = { sectionId: newSec.id, elementId: newEl.id };
                showToast(`Added ${payload.title || 'widget'} to ${newSec.title || newSec.id}`);
              }
              return;
            }

            const secRect = sec.getBoundingClientRect();
            const rawX = ((e.clientX - secRect.left) / secRect.width) * 100;
            const rawY = ((e.clientY - secRect.top) / secRect.height) * 100;
            const x = Math.round(Math.max(5, Math.min(95, rawX)) * 10) / 10;
            const y = Math.round(Math.max(5, Math.min(95, rawY)) * 10) / 10;

            const newEl = stackManager.addElement(sec.id, {
              ...(payload.elData || {}),
              x,
              y
            });

            if (newEl) {
              cs.pendingElement = { sectionId: sec.id, elementId: newEl.id };
              showToast(`Added ${payload.title || 'widget'} at (${x}%, ${y}%)`);
            }
          } else {
            const currentStack = stackManager.getStack();
            let targetIndex = currentStack.length;

            if (targetSection) {
              const secRect = targetSection.getBoundingClientRect();
              const isUpper = (e.clientY - secRect.top) < (secRect.height / 2);
              const secIndex = currentStack.findIndex(s => s.id === targetSection.id);
              if (secIndex !== -1) {
                targetIndex = isUpper ? secIndex : secIndex + 1;
              }
            }

            const res = addOrReplaceLandingSection(payload.slug, {
              title: payload.title,
              category: payload.normCat
            }, targetIndex);

            if (res && res.section) {
              setActiveSection(res.section.id);
              cs.pendingSection = res.section.id;
            }
          }
        });
      });
    }


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
