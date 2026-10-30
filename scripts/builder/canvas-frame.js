/**
 * Preview iframe wiring (runs on every iframe load): element drag and resize, section resize, context menu trigger and drag-and-drop of catalogue cards onto the page.
 * Split out of canvas.js; everything it touches arrives through `deps` (see createCanvasController).
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function wire(deps) {
    const { previewFrame, handleHistoryKeydown, handleCanvasElementKeydown, cs, selectCanvasElement, closeToolbarPopup, ensureResizeHandles, elementEditToolbar, updateToolbarPosition, clearElementSelection, canvasContextMenu, hideContextMenu, focusElementPrimaryText, pushHistorySnapshot, toolbarBtnWidth, toolbarBtnHeight, toolbarImgWidth, toolbarImgHeight, toolbarCardWidth, toolbarCardHeight, toolbarTableWidth, toolbarTableHeight, stackManager, getActiveSection, setActiveSection, addWithTemplateGuard } = deps;

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

        cs.activeContext = {
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

        // Content shrinks (text included) as the section gets shorter, down to this component's minimum
        const naturalHeight = window.SectionFit.measureNatural(sectionEl);
        const minScale = window.SectionFit.minScaleFor(sectionEl.dataset.sectionSlug);
        let newScale = 1;
        let atMinimum = false;

        function onSectionResizeMove(moveEvent) {
          const frameRect = previewFrame.getBoundingClientRect();
          const mouseY = (moveEvent.view === window) ? (moveEvent.clientY - frameRect.top) : moveEvent.clientY;
          const deltaY = mouseY - startY;
          const requested = Math.min(2600, Math.round(initialHeight + deltaY));
          const fitted = window.SectionFit.apply(sectionEl, requested, naturalHeight, minScale);
          newHeight = fitted.height;
          newScale = fitted.scale;
          atMinimum = requested <= fitted.minHeight;

          // Show live height floating tooltip inside the iframe
          let sizeTooltip = doc.getElementById('sectionResizeTooltip');
          if (!sizeTooltip) {
            sizeTooltip = doc.createElement('div');
            sizeTooltip.id = 'sectionResizeTooltip';
            sizeTooltip.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,15,22,0.92);color:#fafafa;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;font-family:monospace;border:1px solid rgba(168,85,247,0.5);box-shadow:0 8px 24px rgba(0,0,0,0.6);z-index:99999;pointer-events:none;';
            doc.body.appendChild(sizeTooltip);
          }
          sizeTooltip.textContent = `Section Height: ${newHeight}px` + (newScale < 1 ? ` · text ${Math.round(newScale * 100)}%` : '') + (atMinimum ? ' · minimum' : '');
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
            customHeight: newHeight,
            fitScale: newScale
          });
          showToast(atMinimum ? `Smallest size for this section: ${newHeight}px` : `Section height updated: ${newHeight}px`);
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

      doc.addEventListener('drop', async (e) => {
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

          const res = await addWithTemplateGuard(payload.slug, {
            title: payload.title,
            category: payload.normCat
          }, targetIndex);
          if (!res) return; // a full website that the person chose not to use

          if (res && res.section) {
            setActiveSection(res.section.id);
            cs.pendingSection = res.section.id;
          }
        }
      });
    });
  }


  }

  const api = { wire };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderCanvasFrame = api;
})();
