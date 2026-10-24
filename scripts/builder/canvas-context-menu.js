/**
 * Right-click context menu actions: add widgets to a section, edit, duplicate and delete elements.
 * Split out of canvas.js; everything it touches arrives through `deps` (see createCanvasController).
 */
(function () {
  'use strict';

  const { showToast } = (typeof window !== 'undefined' && window.BuilderUI) || require('./ui-helpers.js');

  function wire(deps) {
    const { canvasContextMenu, hideContextMenu, cs, stackManager, focusElementPrimaryText, openEditToolbar, toolbarBtnWidth, toolbarImgWidth, toolbarCardWidth, toolbarTableWidth, pushHistorySnapshot, clearElementSelection } = deps;

  // Context Menu Action Listeners
  if (canvasContextMenu) {
    canvasContextMenu.addEventListener('click', (e) => {
      const itemBtn = e.target.closest('.context-menu-item');
      if (!itemBtn) return;
      const action = itemBtn.dataset.action;

      if (action === 'edit-text') {
        hideContextMenu();
        const targetSectionId = (cs.activeContext && cs.activeContext.sectionId) || (cs.selected && cs.selected.sectionId);
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
        const targetSectionId = (cs.activeContext && cs.activeContext.sectionId) || (cs.selected && cs.selected.sectionId);
        let targetElementId = (cs.activeContext && cs.activeContext.elementId) || (cs.selected ? cs.selected.elementId : null);
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
        const targetSectionId = (cs.activeContext && cs.activeContext.sectionId) || (cs.selected && cs.selected.sectionId);
        let targetElementId = (cs.activeContext && cs.activeContext.elementId) || (cs.selected ? cs.selected.elementId : null);
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
        const targetSectionId = (cs.activeContext && cs.activeContext.sectionId) || (cs.selected && cs.selected.sectionId);
        let targetElementId = (cs.activeContext && cs.activeContext.elementId) || (cs.selected ? cs.selected.elementId : null);
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

      if (!cs.activeContext) return;
      let elData = { x: cs.activeContext.xPct, y: cs.activeContext.yPct };

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

      const targetSectionId = cs.activeContext.sectionId;
      const newEl = stackManager.addElement(targetSectionId, elData);

      hideContextMenu();
      if (newEl) {
        cs.pendingElement = { sectionId: targetSectionId, elementId: newEl.id };
        showToast(`Added ${newEl.type} to section`);
      }
    });
  }
  }

  const api = { wire };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BuilderCanvasContextMenu = api;
})();
