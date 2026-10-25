/**
 * Edit-toolbar input wiring: table, card, button, image and badge fields write back to the selected element.
 * Split out of canvas.js; everything it touches arrives through `deps` (see createCanvasController).
 */
(function () {
  'use strict';

  const { escapeHtml, showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function wire(deps) {
    const { toolbarCloseBtn, hideEditToolbar, toolbarTableTitle, cs, stackManager, previewFrame, toolbarTablePrice, toolbarTableFeatures, toolbarTableCtaText, toolbarTableCtaLink, toolbarCardTitle, toolbarCardSubtitle, toolbarCardDesc, toolbarCardBadge, toolbarBtnText, toolbarBtnLink, toolbarBtnStylePills, toolbarImgUrl, toolbarImgSizePills, updateToolbarPosition, toolbarBadgeText, toolbarBadgeStylePills, toolbarTableWidth, toolbarTableHeight, toolbarCardWidth, toolbarCardHeight, toolbarBtnWidth, toolbarBtnHeight, toolbarImgWidth, toolbarImgHeight, toolbarDeleteBtn } = deps;

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

  }

  const api = { wire };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderCanvasToolbarInputs = api;
})();
