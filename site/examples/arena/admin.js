/**
 * edvlabs Arena — Admin Panel Controller (admin.js)
 *
 * Capabilities:
 * - Edit, reorder, add, and delete 3D Cylindrical Carousel projects (images, titles, CTA labels, links)
 * - Edit Hero, About, Client Logos Marquee, Services Cards, Athletes Roster, Cursor Trail, Team, Ready CTA, Contact & FAQ
 * - Undo / Redo history stack (up to 50 snapshots) with Ctrl+Z / Ctrl+Y keyboard shortcuts
 * - Visual Media Library Picker + Device Image Upload (compressed Data URLs) + Custom URLs
 * - Real-time synchronization with live preview iframe (Desktop, Tablet 768px, Mobile 375px)
 * - Export JSON & Validated Import JSON
 */

(function () {
  'use strict';

  const MAX_HISTORY = 50;
  let siteData = window.EDVStore.loadDraft();
  let currentTab = 'carousel';
  let activeMediaCallback = null;
  let currentMediaCat = 'All';
  let mediaSearchQuery = '';
  let toastTimeout = null;
  let debounceSaveTimer = null;

  const historyStack = [window.EDVStore.deepClone(siteData)];
  let historyIndex = 0;

  const escapeHtml = (str) => window.EDVStore.escapeHtml(str);
  const sanitizeUrl = (url, fallback, allowData) => window.EDVStore.sanitizeUrl(url, fallback, allowData);

  document.addEventListener('DOMContentLoaded', () => {
    initSidebarTabs();
    initTopbarActions();
    initViewportToolbar();
    initMediaModal();
    updateCounts();
    updateHistoryButtons();
    updatePublishStatusUI();
    renderCurrentTab();
  });

  /* ==========================================================================
     1. Draft State Persistence, Undo/Redo History & Explicit Publish
     ========================================================================== */
  function pushHistorySnapshot(snapshot) {
    const serialized = JSON.stringify(snapshot);
    if (historyIndex >= 0 && JSON.stringify(historyStack[historyIndex]) === serialized) {
      return;
    }
    historyStack.splice(historyIndex + 1);
    historyStack.push(window.EDVStore.deepClone(snapshot));
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    } else {
      historyIndex = historyStack.length - 1;
    }
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = historyIndex <= 0;
    if (btnRedo) btnRedo.disabled = historyIndex >= historyStack.length - 1;
  }

  function updatePublishStatusUI() {
    const isUnpublished = window.EDVStore.hasUnpublishedChanges(siteData);
    const pill = document.getElementById('sync-status-pill');
    const btnPublish = document.getElementById('btn-save-all');

    if (pill) {
      pill.textContent = isUnpublished ? 'Unpublished changes' : 'Published';
      pill.classList.toggle('is-dirty', isUnpublished);
    }
    if (btnPublish) {
      btnPublish.textContent = isUnpublished ? 'Publish Changes' : 'Published';
      btnPublish.disabled = !isUnpublished;
    }
  }

  function performUndo() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    if (historyIndex <= 0) return;
    historyIndex--;
    siteData = window.EDVStore.deepClone(historyStack[historyIndex]);
    saveDraftOnly(siteData);
    updateHistoryButtons();
    renderCurrentTab();
    showToast('Undid last draft change');
  }

  function performRedo() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    siteData = window.EDVStore.deepClone(historyStack[historyIndex]);
    saveDraftOnly(siteData);
    updateHistoryButtons();
    renderCurrentTab();
    showToast('Redid draft change');
  }

  /**
   * Saves changes to the Admin working draft ONLY.
   * Changes will NOT be visible on the live website or preview until publishChanges() is called.
   */
  function saveDraftOnly(data) {
    const normalized = window.EDVStore.saveDraft(data);
    siteData = normalized;
    updateCounts();
    updatePublishStatusUI();
  }

  /**
   * Explicitly publishes the current draft to the live website and updates the live preview iframe.
   */
  function publishChanges() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    pushHistorySnapshot(siteData);
    const normalized = window.EDVStore.publish(siteData);
    siteData = normalized;
    updateCounts();
    updatePublishStatusUI();

    const iframe = document.getElementById('live-preview-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.dispatchEvent(
          new CustomEvent('gp:data-updated', { detail: normalized })
        );
      } catch (_) {}
    }

    showToast('Published! Changes are now live on the website.');
  }

  /**
   * Stages a discrete change into the draft & history stack (without publishing to live site).
   */
  function commitChanges(toastMessage) {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    saveDraftOnly(siteData);
    pushHistorySnapshot(siteData);
    if (toastMessage) {
      showToast(`${toastMessage} (Draft — click Publish Changes to go live)`);
    }
  }

  /**
   * Debounces live text input draft saves so typing stays 60fps and groups keystrokes into a single Undo step.
   */
  function scheduleCommitChanges() {
    const pill = document.getElementById('sync-status-pill');
    if (pill) {
      pill.textContent = 'Unpublished changes';
      pill.classList.add('is-dirty');
    }
    const btnPublish = document.getElementById('btn-save-all');
    if (btnPublish) {
      btnPublish.textContent = 'Publish Changes';
      btnPublish.disabled = false;
    }
    if (debounceSaveTimer) clearTimeout(debounceSaveTimer);
    debounceSaveTimer = setTimeout(() => {
      debounceSaveTimer = null;
      saveDraftOnly(siteData);
      pushHistorySnapshot(siteData);
    }, 260);
  }

  function showToast(msg) {
    const toast = document.getElementById('admin-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  }

  function updateCounts() {
    const setCnt = (id, n) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(n);
    };
    setCnt('count-carousel', (siteData.carouselProjects || []).length);
    setCnt('count-clients', (siteData.clients || []).length);
    setCnt('count-services', ((siteData.servicesSection || {}).cards || []).length);
    setCnt('count-athletes', ((siteData.athletesSection || {}).athletes || []).length);
  }

  /**
   * Computes which 3D Cylinder panel (#1..#12) and slot (Top / Bottom / Center)
   * a given project index occupies in the alternating 2-item / 1-item checkerboard layout.
   */
  function getCylinderSlotLabel(index) {
    let cursor = 0;
    let panelIdx = 0;
    while (cursor <= index) {
      const count = panelIdx % 2 === 0 ? 2 : 1;
      if (index < cursor + count) {
        const panelNum = panelIdx + 1;
        if (count === 1) {
          return `Panel ${panelNum} • Center`;
        }
        return index === cursor ? `Panel ${panelNum} • Top` : `Panel ${panelNum} • Bottom`;
      }
      cursor += count;
      panelIdx++;
    }
    return `Card #${index + 1}`;
  }

  /* ==========================================================================
     2. Sidebar Navigation & Topbar Controls
     ========================================================================== */
  function initSidebarTabs() {
    const titles = {
      carousel: '3D Carousel Projects',
      'hero-about': 'Hero & About Sections',
      clients: 'Client Logos Marquee',
      services: 'Services Expandable Cards',
      athletes: 'Athletes Roster & Filters',
      'trail-team': 'Cursor Image Trail & Team',
      'cta-faq': 'Ready CTA, Contact & FAQ',
      'media-backup': 'Media Library & Backup',
    };

    document.querySelectorAll('.admin-nav__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentTab = btn.getAttribute('data-tab') || 'carousel';
        document.querySelectorAll('.admin-nav__item').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', String(active));
        });

        const titleEl = document.getElementById('current-section-title');
        if (titleEl && titles[currentTab]) {
          titleEl.textContent = titles[currentTab];
        }
        renderCurrentTab();
      });
    });
  }

  function initTopbarActions() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.addEventListener('click', performUndo);
    if (btnRedo) btnRedo.addEventListener('click', performRedo);

    document.addEventListener('keydown', (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        performRedo();
      } else if (key === 's') {
        e.preventDefault();
        publishChanges();
      }
    });

    const btnPreview = document.getElementById('btn-toggle-preview');
    const workspace = document.getElementById('admin-workspace');

    if (btnPreview && workspace) {
      btnPreview.addEventListener('click', () => {
        const isHidden = workspace.classList.toggle('preview-hidden');
        workspace.classList.toggle('force-preview-mobile', !isHidden);
        btnPreview.setAttribute('aria-pressed', String(!isHidden));
      });
    }

    const btnSave = document.getElementById('btn-save-all');
    if (btnSave) {
      btnSave.addEventListener('click', publishChanges);
    }

    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', exportSiteJson);
    }
  }

  function initViewportToolbar() {
    const stage = document.getElementById('admin-preview-stage');
    document.querySelectorAll('.viewport-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-viewport') || 'desktop';
        document.querySelectorAll('.viewport-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
        if (stage) stage.setAttribute('data-mode', mode);
      });
    });

    const refreshBtn = document.getElementById('btn-refresh-preview');
    const iframe = document.getElementById('live-preview-iframe');
    if (refreshBtn && iframe) {
      refreshBtn.addEventListener('click', () => {
        iframe.contentWindow.location.reload();
      });
    }
  }

  function exportSiteJson() {
    const blob = new Blob([JSON.stringify(siteData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edvlabs-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported JSON configuration');
  }

  /* ==========================================================================
     3. Tab View Renderers
     ========================================================================== */
  function renderCurrentTab() {
    const pane = document.getElementById('admin-editor-pane');
    if (!pane) return;

    switch (currentTab) {
      case 'carousel':
        renderCarouselTab(pane);
        break;
      case 'hero-about':
        renderHeroAboutTab(pane);
        break;
      case 'clients':
        renderClientsTab(pane);
        break;
      case 'services':
        renderServicesTab(pane);
        break;
      case 'athletes':
        renderAthletesTab(pane);
        break;
      case 'trail-team':
        renderTrailTeamTab(pane);
        break;
      case 'cta-faq':
        renderCtaFaqTab(pane);
        break;
      case 'media-backup':
        renderMediaBackupTab(pane);
        break;
      default:
        renderCarouselTab(pane);
    }
  }

  /* --- Tab 1: 3D Carousel Projects --- */
  function renderCarouselTab(pane) {
    const projects = siteData.carouselProjects || [];
    const heading = (siteData.projectsSection && siteData.projectsSection.heading) || 'WORK THAT SPEAKS';
    const footerText = (siteData.projectsSection && siteData.projectsSection.footerText) || '';

    pane.innerHTML = `
      <div class="editor-banner">
        <div>
          <strong>3D Cylindrical Carousel &amp; Mobile Touch Slider (${projects.length} cards)</strong>
          <p>Odd panels hold 2 stacked cards (Top + Bottom) and even panels hold 1 centered card around the 360° cylinder. Edits are saved as drafts and become visible on the website after clicking <strong>Publish Changes</strong>.</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" id="btn-add-carousel-project">
          + Add Project Card
        </button>
      </div>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Projects Section Copy</h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="field-group">
            <label class="field-label" for="input-projects-heading">Watermark / Section Heading</label>
            <input type="text" id="input-projects-heading" class="admin-input" value="${escapeHtml(heading)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="input-projects-footer">Bottom Caption / Footer Text</label>
            <input type="text" id="input-projects-footer" class="admin-input" value="${escapeHtml(footerText)}" />
          </div>
        </div>
      </section>

      <div class="editor-grid" id="carousel-projects-grid">
        ${projects
          .map(
            (proj, idx) => `
          <article class="item-card" data-idx="${idx}">
            <div class="item-card__media">
              <img src="${escapeHtml(sanitizeUrl(proj.image))}" alt="${escapeHtml(proj.title)}" loading="lazy" />
              <span class="item-card__badge">#${idx + 1} • ${escapeHtml(getCylinderSlotLabel(idx))}</span>
              <div class="item-card__media-actions">
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary js-pick-project-img" data-idx="${idx}">
                  Change Image
                </button>
              </div>
            </div>
            <div class="item-card__body">
              <div class="field-group">
                <label class="field-label" for="proj-title-${idx}">Overlay Title</label>
                <input type="text" id="proj-title-${idx}" name="proj-title-${idx}" class="admin-input js-proj-title" data-idx="${idx}" value="${escapeHtml(proj.title)}" />
              </div>
              <div class="field-group">
                <label class="field-label" for="proj-image-${idx}">Image Path / URL</label>
                <input type="text" id="proj-image-${idx}" name="proj-image-${idx}" class="admin-input js-proj-image" data-idx="${idx}" value="${escapeHtml(proj.image)}" />
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;">
                <div class="field-group">
                  <label class="field-label" for="proj-cta-${idx}">CTA Label</label>
                  <input type="text" id="proj-cta-${idx}" class="admin-input js-proj-cta" data-idx="${idx}" value="${escapeHtml(proj.ctaLabel || 'Explore more')}" />
                </div>
                <div class="field-group">
                  <label class="field-label" for="proj-link-${idx}">Target Link</label>
                  <input type="text" id="proj-link-${idx}" class="admin-input js-proj-link" data-idx="${idx}" value="${escapeHtml(proj.link || '#contact')}" />
                </div>
              </div>
              <div class="item-card__footer">
                <div>
                  <button type="button" class="admin-btn admin-btn--icon js-proj-move" data-idx="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Move earlier">&uarr;</button>
                  <button type="button" class="admin-btn admin-btn--icon js-proj-move" data-idx="${idx}" data-dir="1" ${idx === projects.length - 1 ? 'disabled' : ''} title="Move later">&darr;</button>
                </div>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--danger-ghost js-proj-delete" data-idx="${idx}">
                  Remove
                </button>
              </div>
            </div>
          </article>`
          )
          .join('')}
      </div>
    `;

    const headingInput = document.getElementById('input-projects-heading');
    if (headingInput) {
      headingInput.addEventListener('input', () => {
        siteData.projectsSection = siteData.projectsSection || {};
        siteData.projectsSection.heading = headingInput.value;
        scheduleCommitChanges();
      });
    }

    const footerInput = document.getElementById('input-projects-footer');
    if (footerInput) {
      footerInput.addEventListener('input', () => {
        siteData.projectsSection = siteData.projectsSection || {};
        siteData.projectsSection.footerText = footerInput.value;
        scheduleCommitChanges();
      });
    }

    const addBtn = document.getElementById('btn-add-carousel-project');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        siteData.carouselProjects.push({
          id: `proj-${Date.now()}`,
          title: 'New Project Showcase',
          image: './assets/images/art-01.svg',
          alt: 'New Project Showcase',
          ctaLabel: 'Explore more',
          link: '#contact',
        });
        commitChanges('Added project card to carousel');
        renderCarouselTab(pane);
      });
    }

    pane.querySelectorAll('.js-proj-title').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        if (siteData.carouselProjects[idx]) {
          siteData.carouselProjects[idx].title = input.value;
          siteData.carouselProjects[idx].alt = input.value;
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('.js-proj-cta').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        if (siteData.carouselProjects[idx]) {
          siteData.carouselProjects[idx].ctaLabel = input.value;
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('.js-proj-link').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        if (siteData.carouselProjects[idx]) {
          siteData.carouselProjects[idx].link = input.value.trim();
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('.js-proj-image').forEach((input) => {
      input.addEventListener('change', () => {
        const idx = Number(input.getAttribute('data-idx'));
        if (siteData.carouselProjects[idx]) {
          const clean = sanitizeUrl(input.value.trim());
          if (!clean) {
            showToast('Blocked unsafe image URL');
            return;
          }
          siteData.carouselProjects[idx].image = clean;
          commitChanges('Updated carousel image');
          renderCarouselTab(pane);
        }
      });
    });

    pane.querySelectorAll('.js-pick-project-img').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        openMediaPicker((selectedSrc) => {
          if (siteData.carouselProjects[idx]) {
            siteData.carouselProjects[idx].image = selectedSrc;
            commitChanges('Updated carousel project image');
            renderCarouselTab(pane);
          }
        }, 'Projects');
      });
    });

    pane.querySelectorAll('.js-proj-move').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const dir = Number(btn.getAttribute('data-dir'));
        const targetIdx = idx + dir;
        if (targetIdx < 0 || targetIdx >= siteData.carouselProjects.length) return;
        const temp = siteData.carouselProjects[idx];
        siteData.carouselProjects[idx] = siteData.carouselProjects[targetIdx];
        siteData.carouselProjects[targetIdx] = temp;
        commitChanges('Reordered carousel projects');
        renderCarouselTab(pane);
      });
    });

    pane.querySelectorAll('.js-proj-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (siteData.carouselProjects.length <= 3) {
          showToast('Keep at least 3 project cards for the 3D cylinder');
          return;
        }
        siteData.carouselProjects.splice(idx, 1);
        commitChanges('Removed project card');
        renderCarouselTab(pane);
      });
    });
  }

  /* --- Tab 2: Hero & About --- */
  function renderHeroAboutTab(pane) {
    const hero = siteData.hero || {};
    const about = siteData.about || {};

    pane.innerHTML = `
      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Hero Section (#top)</h2>
        </div>

        <div class="field-group">
          <label class="field-label">Hero Background Image</label>
          <div class="image-inline-picker">
            <img src="${escapeHtml(sanitizeUrl(hero.bgImage))}" alt="Hero preview" class="image-inline-picker__thumb" />
            <div class="image-inline-picker__controls">
              <input type="text" id="hero-bg-input" class="admin-input" value="${escapeHtml(hero.bgImage)}" />
              <div>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary" id="btn-pick-hero-bg">Choose / Upload Image</button>
              </div>
            </div>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="hero-title-input">Hero Headline (H1)</label>
          <input type="text" id="hero-title-input" class="admin-input" value="${escapeHtml(hero.title)}" />
        </div>

        <div class="field-group">
          <label class="field-label" for="hero-subtitle-input">Hero Description Paragraph</label>
          <textarea id="hero-subtitle-input" class="admin-textarea">${escapeHtml(hero.subtitle)}</textarea>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="field-group">
            <label class="field-label" for="hero-cta-text">CTA Button Label</label>
            <input type="text" id="hero-cta-text" class="admin-input" value="${escapeHtml(hero.ctaText)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="hero-cta-link">CTA Button Target Link</label>
            <input type="text" id="hero-cta-link" class="admin-input" value="${escapeHtml(hero.ctaLink)}" />
          </div>
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">About Statement Section (#about)</h2>
        </div>

        <div class="field-group">
          <label class="field-label">About Background Image</label>
          <div class="image-inline-picker">
            <img src="${escapeHtml(sanitizeUrl(about.bgImage))}" alt="About preview" class="image-inline-picker__thumb" />
            <div class="image-inline-picker__controls">
              <input type="text" id="about-bg-input" class="admin-input" value="${escapeHtml(about.bgImage)}" />
              <div>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary" id="btn-pick-about-bg">Choose / Upload Image</button>
              </div>
            </div>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="about-text-input">Scroll-Reveal Statement Text</label>
          <textarea id="about-text-input" class="admin-textarea" style="min-height:110px;">${escapeHtml(about.text)}</textarea>
        </div>
      </section>
    `;

    const bindHeroAbout = () => {
      siteData.hero = {
        ...siteData.hero,
        bgImage: document.getElementById('hero-bg-input').value.trim(),
        title: document.getElementById('hero-title-input').value,
        subtitle: document.getElementById('hero-subtitle-input').value,
        ctaText: document.getElementById('hero-cta-text').value,
        ctaLink: document.getElementById('hero-cta-link').value,
      };
      siteData.about = {
        ...siteData.about,
        bgImage: document.getElementById('about-bg-input').value.trim(),
        text: document.getElementById('about-text-input').value,
      };
      scheduleCommitChanges();
    };

    ['hero-bg-input', 'hero-title-input', 'hero-subtitle-input', 'hero-cta-text', 'hero-cta-link', 'about-bg-input', 'about-text-input'].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', bindHeroAbout);
      }
    );

    document.getElementById('btn-pick-hero-bg').addEventListener('click', () => {
      openMediaPicker((src) => {
        siteData.hero.bgImage = src;
        commitChanges('Updated Hero background image');
        renderHeroAboutTab(pane);
      }, 'Sections');
    });

    document.getElementById('btn-pick-about-bg').addEventListener('click', () => {
      openMediaPicker((src) => {
        siteData.about.bgImage = src;
        commitChanges('Updated About background image');
        renderHeroAboutTab(pane);
      }, 'Sections');
    });
  }

  /* --- Tab 3: Client Logos Marquee --- */
  function renderClientsTab(pane) {
    const clients = siteData.clients || [];

    pane.innerHTML = `
      <div class="editor-banner">
        <div>
          <strong>Infinite Client Logo Marquee (${clients.length} logos)</strong>
          <p>Logos automatically duplicate into two tracks to create a seamless infinite ticker below the Hero section.</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" id="btn-add-client-logo">+ Add Client Logo</button>
      </div>

      <div class="editor-grid">
        ${clients
          .map(
            (c, idx) => `
          <article class="item-card">
            <div class="item-card__media item-card__media--contain">
              <img src="${escapeHtml(sanitizeUrl(c.logo))}" alt="${escapeHtml(c.name)}" loading="lazy" />
              <span class="item-card__badge">Logo #${idx + 1}</span>
              <div class="item-card__media-actions">
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary js-pick-client-logo" data-idx="${idx}">Change Logo</button>
              </div>
            </div>
            <div class="item-card__body">
              <div class="field-group">
                <label class="field-label">Client Name (Alt Text)</label>
                <input type="text" class="admin-input js-client-name" data-idx="${idx}" value="${escapeHtml(c.name)}" />
              </div>
              <div class="field-group">
                <label class="field-label">Logo URL / Path</label>
                <input type="text" class="admin-input js-client-logo" data-idx="${idx}" value="${escapeHtml(c.logo)}" />
              </div>
              <div class="item-card__footer">
                <span></span>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--danger-ghost js-delete-client" data-idx="${idx}">Remove</button>
              </div>
            </div>
          </article>`
          )
          .join('')}
      </div>
    `;

    document.getElementById('btn-add-client-logo').addEventListener('click', () => {
      siteData.clients.push({
        id: `client-${Date.now()}`,
        name: 'New Partner',
        logo: './assets/images/client-12.svg',
      });
      commitChanges('Added client logo');
      renderClientsTab(pane);
    });

    pane.querySelectorAll('.js-client-name').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        if (siteData.clients[idx]) {
          siteData.clients[idx].name = input.value;
          scheduleCommitChanges();
        }
      });
    });

    pane.querySelectorAll('.js-client-logo').forEach((input) => {
      input.addEventListener('change', () => {
        const idx = Number(input.getAttribute('data-idx'));
        if (siteData.clients[idx]) {
          const clean = sanitizeUrl(input.value.trim());
          if (!clean) {
            showToast('Blocked unsafe logo URL');
            return;
          }
          siteData.clients[idx].logo = clean;
          commitChanges('Updated client logo');
          renderClientsTab(pane);
        }
      });
    });

    pane.querySelectorAll('.js-pick-client-logo').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        openMediaPicker((src) => {
          siteData.clients[idx].logo = src;
          commitChanges('Updated client logo');
          renderClientsTab(pane);
        }, 'Logos');
      });
    });

    pane.querySelectorAll('.js-delete-client').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        siteData.clients.splice(idx, 1);
        commitChanges('Removed client logo');
        renderClientsTab(pane);
      });
    });
  }

  /* --- Tab 4: Services Cards --- */
  function renderServicesTab(pane) {
    const srv = siteData.servicesSection || { heading: 'How We Play the Game', subtitle: '', cards: [] };
    const cards = srv.cards || [];

    pane.innerHTML = `
      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Services Section Heading &amp; Subtitle</h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="field-group">
            <label class="field-label" for="services-heading-input">Section Title</label>
            <input type="text" id="services-heading-input" class="admin-input" value="${escapeHtml(srv.heading)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="services-subtitle-input">Section Subtitle</label>
            <input type="text" id="services-subtitle-input" class="admin-input" value="${escapeHtml(srv.subtitle || '')}" />
          </div>
        </div>
      </section>

      <div class="editor-grid">
        ${cards
          .map(
            (card, idx) => `
          <article class="item-card">
            <div class="item-card__media">
              <img src="${escapeHtml(sanitizeUrl(card.image))}" alt="${escapeHtml(card.title)}" loading="lazy" />
              <span class="item-card__badge">Service Card #${idx + 1}</span>
              <div class="item-card__media-actions">
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary js-pick-srv-img" data-idx="${idx}">Change Image</button>
              </div>
            </div>
            <div class="item-card__body">
              <div class="field-group">
                <label class="field-label">Card Title</label>
                <input type="text" class="admin-input js-srv-title" data-idx="${idx}" value="${escapeHtml(card.title)}" />
              </div>
              <div class="field-group">
                <label class="field-label">Card Intro Description</label>
                <input type="text" class="admin-input js-srv-desc" data-idx="${idx}" value="${escapeHtml(card.description || '')}" />
              </div>
              <div class="field-group">
                <label class="field-label">Bullet Points (One per line)</label>
                <textarea class="admin-textarea js-srv-bullets" data-idx="${idx}" style="min-height:130px;">${escapeHtml((card.bullets || []).join('\n'))}</textarea>
              </div>
            </div>
          </article>`
          )
          .join('')}
      </div>
    `;

    document.getElementById('services-heading-input').addEventListener('input', (e) => {
      siteData.servicesSection.heading = e.target.value;
      scheduleCommitChanges();
    });

    document.getElementById('services-subtitle-input').addEventListener('input', (e) => {
      siteData.servicesSection.subtitle = e.target.value;
      scheduleCommitChanges();
    });

    pane.querySelectorAll('.js-srv-title').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        siteData.servicesSection.cards[idx].title = input.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-srv-desc').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        siteData.servicesSection.cards[idx].description = input.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-srv-bullets').forEach((ta) => {
      ta.addEventListener('input', () => {
        const idx = Number(ta.getAttribute('data-idx'));
        siteData.servicesSection.cards[idx].bullets = ta.value
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-pick-srv-img').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        openMediaPicker((src) => {
          siteData.servicesSection.cards[idx].image = src;
          commitChanges('Updated service card image');
          renderServicesTab(pane);
        }, 'Sections');
      });
    });
  }

  /* --- Tab 5: Athletes Roster --- */
  function renderAthletesTab(pane) {
    const athSec = siteData.athletesSection || { heading: '', athletes: [] };
    const athletes = athSec.athletes || [];

    pane.innerHTML = `
      <div class="editor-banner">
        <div>
          <strong>Athletes Roster (${athletes.length} athletes)</strong>
          <p>Manage athlete portraits, names, clubs/roles, and whether they appear under "edvlabs Arena Exclusive" or "All Athletes".</p>
        </div>
        <button type="button" class="admin-btn admin-btn--primary" id="btn-add-athlete">+ Add Athlete</button>
      </div>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Section Heading &amp; Filter Labels</h2>
        </div>
        <div class="field-group">
          <label class="field-label" for="ath-heading-input">Heading</label>
          <input type="text" id="ath-heading-input" class="admin-input" value="${escapeHtml(athSec.heading)}" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="field-group">
            <label class="field-label" for="ath-tab-all">All Tab Button Text</label>
            <input type="text" id="ath-tab-all" class="admin-input" value="${escapeHtml(athSec.tabAllLabel || 'All Athletes')}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="ath-tab-excl">Exclusive Tab Button Text</label>
            <input type="text" id="ath-tab-excl" class="admin-input" value="${escapeHtml(athSec.tabExclusiveLabel || 'edvlabs Arena Exclusive')}" />
          </div>
        </div>
      </section>

      <div class="editor-grid">
        ${athletes
          .map(
            (ath, idx) => `
          <article class="item-card">
            <div class="item-card__media">
              <img src="${escapeHtml(sanitizeUrl(ath.image))}" alt="${escapeHtml(ath.name)}" loading="lazy" />
              <span class="item-card__badge">#${idx + 1} • ${ath.category === 'exclusive' ? 'Exclusive' : 'All Athletes'}</span>
              <div class="item-card__media-actions">
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary js-pick-ath-img" data-idx="${idx}">Change Photo</button>
              </div>
            </div>
            <div class="item-card__body">
              <div class="field-group">
                <label class="field-label">Athlete Name</label>
                <input type="text" class="admin-input js-ath-name" data-idx="${idx}" value="${escapeHtml(ath.name)}" />
              </div>
              <div class="field-group">
                <label class="field-label">Club / Role Subtitle</label>
                <input type="text" class="admin-input js-ath-role" data-idx="${idx}" value="${escapeHtml(ath.role || '')}" placeholder="e.g. Club A" />
              </div>
              <div class="field-group">
                <label class="field-label">Filter Category</label>
                <select class="admin-select js-ath-cat" data-idx="${idx}">
                  <option value="exclusive" ${ath.category === 'exclusive' ? 'selected' : ''}>edvlabs Arena Exclusive (Also in All)</option>
                  <option value="all" ${ath.category !== 'exclusive' ? 'selected' : ''}>All Athletes Only</option>
                </select>
              </div>
              <div class="item-card__footer">
                <div>
                  <button type="button" class="admin-btn admin-btn--icon js-ath-move" data-idx="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>&uarr;</button>
                  <button type="button" class="admin-btn admin-btn--icon js-ath-move" data-idx="${idx}" data-dir="1" ${idx === athletes.length - 1 ? 'disabled' : ''}>&darr;</button>
                </div>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--danger-ghost js-ath-delete" data-idx="${idx}">Remove</button>
              </div>
            </div>
          </article>`
          )
          .join('')}
      </div>
    `;

    const bindAthMeta = () => {
      siteData.athletesSection.heading = document.getElementById('ath-heading-input').value;
      siteData.athletesSection.tabAllLabel = document.getElementById('ath-tab-all').value;
      siteData.athletesSection.tabExclusiveLabel = document.getElementById('ath-tab-excl').value;
      scheduleCommitChanges();
    };

    ['ath-heading-input', 'ath-tab-all', 'ath-tab-excl'].forEach((id) => {
      document.getElementById(id).addEventListener('input', bindAthMeta);
    });

    document.getElementById('btn-add-athlete').addEventListener('click', () => {
      siteData.athletesSection.athletes.push({
        id: `ath-${Date.now()}`,
        name: 'New Athlete',
        role: '',
        category: 'exclusive',
        image: './assets/images/art-13.svg',
      });
      commitChanges('Added athlete card');
      renderAthletesTab(pane);
    });

    pane.querySelectorAll('.js-ath-name').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        siteData.athletesSection.athletes[idx].name = input.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-ath-role').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-idx'));
        siteData.athletesSection.athletes[idx].role = input.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-ath-cat').forEach((sel) => {
      sel.addEventListener('change', () => {
        const idx = Number(sel.getAttribute('data-idx'));
        siteData.athletesSection.athletes[idx].category = sel.value;
        commitChanges('Updated athlete category');
        renderAthletesTab(pane);
      });
    });

    pane.querySelectorAll('.js-pick-ath-img').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        openMediaPicker((src) => {
          siteData.athletesSection.athletes[idx].image = src;
          commitChanges('Updated athlete photo');
          renderAthletesTab(pane);
        }, 'Athletes');
      });
    });

    pane.querySelectorAll('.js-ath-move').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const dir = Number(btn.getAttribute('data-dir'));
        const target = idx + dir;
        const arr = siteData.athletesSection.athletes;
        if (target < 0 || target >= arr.length) return;
        const tmp = arr[idx];
        arr[idx] = arr[target];
        arr[target] = tmp;
        commitChanges('Reordered athletes');
        renderAthletesTab(pane);
      });
    });

    pane.querySelectorAll('.js-ath-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        siteData.athletesSection.athletes.splice(idx, 1);
        commitChanges('Removed athlete');
        renderAthletesTab(pane);
      });
    });
  }

  /* --- Tab 6: Cursor Image Trail & Team --- */
  function renderTrailTeamTab(pane) {
    const trail = siteData.trailSection || { heading: '', images: [] };
    const team = siteData.teamSection || { heading: '', members: [] };

    pane.innerHTML = `
      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Team Behind The Lens (#team)</h2>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--primary" id="btn-add-team-member">+ Add Team Member</button>
        </div>

        <div class="field-group">
          <label class="field-label" for="team-heading-input">Team Section Heading</label>
          <input type="text" id="team-heading-input" class="admin-input" value="${escapeHtml(team.heading)}" />
        </div>

        <div class="editor-grid">
          ${(team.members || [])
            .map(
              (m, idx) => `
            <article class="item-card">
              <div class="item-card__media">
                <img src="${escapeHtml(sanitizeUrl(m.image))}" alt="${escapeHtml(m.name)}" loading="lazy" />
                <span class="item-card__badge">${escapeHtml(m.role)}</span>
                <div class="item-card__media-actions">
                  <button type="button" class="admin-btn admin-btn--sm admin-btn--primary js-pick-team-img" data-idx="${idx}">Change Photo</button>
                </div>
              </div>
              <div class="item-card__body">
                <div class="field-group">
                  <label class="field-label">Full Name</label>
                  <input type="text" class="admin-input js-team-name" data-idx="${idx}" value="${escapeHtml(m.name)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">Role / Title</label>
                  <input type="text" class="admin-input js-team-role" data-idx="${idx}" value="${escapeHtml(m.role)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">Email</label>
                  <input type="email" class="admin-input js-team-email" data-idx="${idx}" value="${escapeHtml(m.email)}" />
                </div>
                <div class="field-group">
                  <label class="field-label">Phone</label>
                  <input type="text" class="admin-input js-team-phone" data-idx="${idx}" value="${escapeHtml(m.phone)}" />
                </div>
                <div class="item-card__footer">
                  <span></span>
                  <button type="button" class="admin-btn admin-btn--sm admin-btn--danger-ghost js-delete-team" data-idx="${idx}">Remove</button>
                </div>
              </div>
            </article>`
            )
            .join('')}
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Interactive Cursor Image Trail (#main-container)</h2>
        </div>

        <div class="field-group">
          <label class="field-label" for="trail-heading-input">Center Pitch Heading</label>
          <input type="text" id="trail-heading-input" class="admin-input" value="${escapeHtml(trail.heading)}" />
        </div>

        <div class="editor-grid">
          ${(trail.images || [])
            .map(
              (src, idx) => `
            <article class="item-card">
              <div class="item-card__media">
                <img src="${escapeHtml(sanitizeUrl(src))}" alt="Trail image ${idx + 1}" loading="lazy" />
                <span class="item-card__badge">Trail #${idx + 1}</span>
                <div class="item-card__media-actions">
                  <button type="button" class="admin-btn admin-btn--sm admin-btn--primary js-pick-trail-img" data-idx="${idx}">Swap Image</button>
                </div>
              </div>
            </article>`
            )
            .join('')}
        </div>
      </section>
    `;

    document.getElementById('team-heading-input').addEventListener('input', (e) => {
      siteData.teamSection.heading = e.target.value;
      scheduleCommitChanges();
    });

    document.getElementById('trail-heading-input').addEventListener('input', (e) => {
      siteData.trailSection.heading = e.target.value;
      scheduleCommitChanges();
    });

    document.getElementById('btn-add-team-member').addEventListener('click', () => {
      siteData.teamSection.members.push({
        id: `team-${Date.now()}`,
        name: 'New Team Member',
        role: 'Producer',
        email: 'hello@edvlabs.example',
        phone: '+32 470 00 00 00',
        image: './assets/images/art-11.svg',
      });
      commitChanges('Added team member');
      renderTrailTeamTab(pane);
    });

    pane.querySelectorAll('.js-team-name').forEach((el) => {
      el.addEventListener('input', () => {
        siteData.teamSection.members[Number(el.dataset.idx)].name = el.value;
        scheduleCommitChanges();
      });
    });
    pane.querySelectorAll('.js-team-role').forEach((el) => {
      el.addEventListener('input', () => {
        siteData.teamSection.members[Number(el.dataset.idx)].role = el.value;
        scheduleCommitChanges();
      });
    });
    pane.querySelectorAll('.js-team-email').forEach((el) => {
      el.addEventListener('input', () => {
        siteData.teamSection.members[Number(el.dataset.idx)].email = el.value;
        scheduleCommitChanges();
      });
    });
    pane.querySelectorAll('.js-team-phone').forEach((el) => {
      el.addEventListener('input', () => {
        siteData.teamSection.members[Number(el.dataset.idx)].phone = el.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-pick-team-img').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        openMediaPicker((src) => {
          siteData.teamSection.members[idx].image = src;
          commitChanges('Updated team member photo');
          renderTrailTeamTab(pane);
        }, 'Team');
      });
    });

    pane.querySelectorAll('.js-delete-team').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        siteData.teamSection.members.splice(idx, 1);
        commitChanges('Removed team member');
        renderTrailTeamTab(pane);
      });
    });

    pane.querySelectorAll('.js-pick-trail-img').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        openMediaPicker((src) => {
          siteData.trailSection.images[idx] = src;
          commitChanges('Updated cursor trail image');
          renderTrailTeamTab(pane);
        }, 'Trail');
      });
    });
  }

  /* --- Tab 7: Ready CTA, Contact & FAQ --- */
  function renderCtaFaqTab(pane) {
    const ready = siteData.readySection || {};
    const contact = siteData.contactSection || {};
    const faq = siteData.faqSection || { heading: 'FREQUENTLY ASKED QUESTIONS', items: [] };

    pane.innerHTML = `
      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Ready To Play CTA Section</h2>
        </div>

        <div class="field-group">
          <label class="field-label">Split Feature Image</label>
          <div class="image-inline-picker">
            <img src="${escapeHtml(sanitizeUrl(ready.image))}" alt="Ready preview" class="image-inline-picker__thumb" />
            <div class="image-inline-picker__controls">
              <input type="text" id="ready-img-input" class="admin-input" value="${escapeHtml(ready.image)}" />
              <div>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--primary" id="btn-pick-ready-img">Choose / Upload Image</button>
              </div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="field-group">
            <label class="field-label" for="ready-heading-input">CTA Heading</label>
            <input type="text" id="ready-heading-input" class="admin-input" value="${escapeHtml(ready.heading)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="ready-btn-input">CTA Button Text</label>
            <input type="text" id="ready-btn-input" class="admin-input" value="${escapeHtml(ready.ctaText)}" />
          </div>
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Contact Form Section (#contact)</h2>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="field-group">
            <label class="field-label" for="contact-heading-input">Contact Heading</label>
            <input type="text" id="contact-heading-input" class="admin-input" value="${escapeHtml(contact.heading)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="contact-submit-input">Submit Button Text</label>
            <input type="text" id="contact-submit-input" class="admin-input" value="${escapeHtml(contact.submitText)}" />
          </div>
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">FAQ Accordion Items (#faq)</h2>
          <button type="button" class="admin-btn admin-btn--sm admin-btn--primary" id="btn-add-faq">+ Add FAQ Item</button>
        </div>

        <div class="field-group">
          <label class="field-label" for="faq-heading-input">FAQ Section Heading</label>
          <input type="text" id="faq-heading-input" class="admin-input" value="${escapeHtml(faq.heading)}" />
        </div>

        <div style="display:flex;flex-direction:column;gap:0.85rem;">
          ${(faq.items || [])
            .map(
              (item, idx) => `
            <div class="item-card" style="padding:1rem;gap:0.65rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="field-label">Question #${idx + 1}</span>
                <button type="button" class="admin-btn admin-btn--sm admin-btn--danger-ghost js-delete-faq" data-idx="${idx}">Delete</button>
              </div>
              <input type="text" class="admin-input js-faq-q" data-idx="${idx}" value="${escapeHtml(item.question)}" />
              <label class="field-label">Answer (Use double newline for multiple paragraphs)</label>
              <textarea class="admin-textarea js-faq-a" data-idx="${idx}">${escapeHtml(item.answer)}</textarea>
            </div>`
            )
            .join('')}
        </div>
      </section>
    `;

    const bindCtaMeta = () => {
      siteData.readySection.image = document.getElementById('ready-img-input').value.trim();
      siteData.readySection.heading = document.getElementById('ready-heading-input').value;
      siteData.readySection.ctaText = document.getElementById('ready-btn-input').value;
      siteData.contactSection.heading = document.getElementById('contact-heading-input').value;
      siteData.contactSection.submitText = document.getElementById('contact-submit-input').value;
      siteData.faqSection.heading = document.getElementById('faq-heading-input').value;
      scheduleCommitChanges();
    };

    ['ready-img-input', 'ready-heading-input', 'ready-btn-input', 'contact-heading-input', 'contact-submit-input', 'faq-heading-input'].forEach(
      (id) => {
        document.getElementById(id).addEventListener('input', bindCtaMeta);
      }
    );

    document.getElementById('btn-pick-ready-img').addEventListener('click', () => {
      openMediaPicker((src) => {
        siteData.readySection.image = src;
        commitChanges('Updated Ready CTA image');
        renderCtaFaqTab(pane);
      }, 'Sections');
    });

    document.getElementById('btn-add-faq').addEventListener('click', () => {
      siteData.faqSection.items.push({
        id: `faq-${Date.now()}`,
        question: 'New Question?',
        answer: 'Enter your answer here.',
      });
      commitChanges('Added FAQ item');
      renderCtaFaqTab(pane);
    });

    pane.querySelectorAll('.js-faq-q').forEach((el) => {
      el.addEventListener('input', () => {
        siteData.faqSection.items[Number(el.dataset.idx)].question = el.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-faq-a').forEach((el) => {
      el.addEventListener('input', () => {
        siteData.faqSection.items[Number(el.dataset.idx)].answer = el.value;
        scheduleCommitChanges();
      });
    });

    pane.querySelectorAll('.js-delete-faq').forEach((btn) => {
      btn.addEventListener('click', () => {
        siteData.faqSection.items.splice(Number(btn.dataset.idx), 1);
        commitChanges('Removed FAQ item');
        renderCtaFaqTab(pane);
      });
    });
  }

  /* --- Tab 8: Media Library & JSON Backup --- */
  function renderMediaBackupTab(pane) {
    const allMedia = window.EDVStore.getMediaLibrary();

    pane.innerHTML = `
      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Configuration Backup &amp; Restore (JSON)</h2>
        </div>
        <p style="color:var(--admin-text-muted);">Export your current carousel images and page text to a JSON file, or import a previously saved configuration file.</p>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <button type="button" class="admin-btn admin-btn--primary" id="btn-tab-export">Download Site JSON</button>
          <label class="admin-btn admin-btn--outline" style="cursor:pointer;">
            <span>Import Site JSON...</span>
            <input type="file" id="input-import-json" accept="application/json,.json" hidden />
          </label>
        </div>
      </section>

      <section class="editor-card">
        <div class="editor-card__header">
          <h2 class="editor-card__title">Asset Library (${allMedia.length} total assets)</h2>
          <label class="admin-btn admin-btn--sm admin-btn--primary" style="cursor:pointer;">
            <span>+ Upload New Image to Library</span>
            <input type="file" id="input-library-upload" accept="image/*" hidden />
          </label>
        </div>
        <div class="media-grid" style="max-height:none;padding:0;">
          ${allMedia
            .map(
              (m, idx) => `
            <div class="media-tile" title="${escapeHtml(m.src)}" style="position:relative;">
              <img src="${escapeHtml(sanitizeUrl(m.src))}" alt="${escapeHtml(m.label)}" class="media-tile__thumb" loading="lazy" />
              <div class="media-tile__meta">
                <div class="media-tile__label">${escapeHtml(m.label)}</div>
                <div class="media-tile__cat">${escapeHtml(m.category)}</div>
              </div>
              ${
                m.custom
                  ? `<button type="button" class="admin-btn admin-btn--sm admin-btn--danger-ghost js-delete-upload" data-id="${escapeHtml(m.id || m.src)}" style="margin:0.25rem 0.5rem 0.5rem;">Remove Upload</button>`
                  : ''
              }
            </div>`
            )
            .join('')}
        </div>
      </section>
    `;

    document.getElementById('btn-tab-export').addEventListener('click', exportSiteJson);

    pane.querySelectorAll('.js-delete-upload').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idOrSrc = btn.getAttribute('data-id');
        if (idOrSrc && window.EDVStore.deleteCustomUpload) {
          window.EDVStore.deleteCustomUpload(idOrSrc);
          showToast('Removed uploaded image from library');
          renderMediaBackupTab(pane);
        }
      });
    });

    const importInput = document.getElementById('input-import-json');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('Root JSON must be a configuration object.');
            }
            siteData = window.EDVStore.normalizeSiteData(parsed);
            commitChanges('Imported site configuration JSON!');
            renderMediaBackupTab(pane);
          } catch (err) {
            window.alert('Could not parse JSON file: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    const uploadInput = document.getElementById('input-library-upload');
    if (uploadInput) {
      uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const dataUrl = await compressImageFile(file);
        window.EDVStore.addUploadedMedia(file.name.replace(/\.[^.]+$/, ''), dataUrl);
        showToast('Uploaded image added to Media Library!');
        renderMediaBackupTab(pane);
      });
    }
  }

  /* ==========================================================================
     4. Visual Media Library Modal & Client-Side Image Compressor
     ========================================================================== */
  function initMediaModal() {
    const modal = document.getElementById('media-modal');
    const closeBtn = document.getElementById('media-modal-close');
    const searchInput = document.getElementById('media-search-input');
    const uploadInput = document.getElementById('media-upload-input');
    const customUrlInput = document.getElementById('media-custom-url-input');
    const useUrlBtn = document.getElementById('btn-use-custom-url');

    if (!modal) return;

    const closeModal = () => {
      modal.hidden = true;
      activeMediaCallback = null;
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    document.querySelectorAll('#media-category-tabs .media-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentMediaCat = btn.getAttribute('data-cat') || 'All';
        document.querySelectorAll('#media-category-tabs .media-filter-btn').forEach((b) =>
          b.classList.toggle('is-active', b === btn)
        );
        renderMediaModalGrid();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        mediaSearchQuery = searchInput.value.trim().toLowerCase();
        renderMediaModalGrid();
      });
    }

    if (uploadInput) {
      uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const dataUrl = await compressImageFile(file);
        const label = file.name.replace(/\.[^.]+$/, '');
        window.EDVStore.addUploadedMedia(label, dataUrl);
        if (typeof activeMediaCallback === 'function') {
          activeMediaCallback(dataUrl);
        }
        closeModal();
      });
    }

    if (useUrlBtn && customUrlInput) {
      useUrlBtn.addEventListener('click', () => {
        const rawUrl = customUrlInput.value.trim();
        const url = sanitizeUrl(rawUrl);
        if (!url) {
          showToast('Please enter a valid, safe image URL');
          return;
        }
        if (typeof activeMediaCallback === 'function') {
          activeMediaCallback(url);
        }
        customUrlInput.value = '';
        closeModal();
      });
    }
  }

  function openMediaPicker(onSelect, preferredCategory) {
    const modal = document.getElementById('media-modal');
    if (!modal) return;
    activeMediaCallback = onSelect;
    currentMediaCat = preferredCategory || 'All';
    mediaSearchQuery = '';

    const searchInput = document.getElementById('media-search-input');
    if (searchInput) searchInput.value = '';

    document.querySelectorAll('#media-category-tabs .media-filter-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.getAttribute('data-cat') === currentMediaCat);
    });

    renderMediaModalGrid();
    modal.hidden = false;
  }

  function renderMediaModalGrid() {
    const grid = document.getElementById('media-picker-grid');
    if (!grid) return;

    const allItems = window.EDVStore.getMediaLibrary();
    const filtered = allItems.filter((item) => {
      const catMatch = currentMediaCat === 'All' || item.category === currentMediaCat;
      const queryMatch =
        !mediaSearchQuery ||
        item.label.toLowerCase().includes(mediaSearchQuery) ||
        item.src.toLowerCase().includes(mediaSearchQuery);
      return catMatch && queryMatch;
    });

    grid.innerHTML = filtered
      .map(
        (item, idx) => `
      <button type="button" class="media-tile" data-idx="${idx}">
        <img src="${escapeHtml(sanitizeUrl(item.src))}" alt="${escapeHtml(item.label)}" class="media-tile__thumb" loading="lazy" />
        <div class="media-tile__meta">
          <div class="media-tile__label">${escapeHtml(item.label)}</div>
          <div class="media-tile__cat">${escapeHtml(item.category)}</div>
        </div>
      </button>`
      )
      .join('');

    grid.querySelectorAll('.media-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const idx = Number(tile.getAttribute('data-idx'));
        const chosen = filtered[idx];
        if (chosen && typeof activeMediaCallback === 'function') {
          activeMediaCallback(chosen.src);
        }
        document.getElementById('media-modal').hidden = true;
        activeMediaCallback = null;
      });
    });
  }

  /**
   * Compresses an uploaded image file via HTML5 Canvas (max 1600px dimension, WebP 0.84)
   * so custom uploaded photos fit comfortably in localStorage and render fast.
   */
  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(String(reader.result));
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const out = canvas.toDataURL('image/webp', 0.84);
          resolve(out);
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }
})();
