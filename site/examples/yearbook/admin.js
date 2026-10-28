/**
 * edvlabs — THE YEARBOOK Admin CMS Studio Controller (`admin.js`)
 */

(function () {
  'use strict';

  // Store & Working State
  let workingData = window.YBStore ? window.YBStore.loadDraft() : {};
  let currentTab = 'articles';
  let activeMediaPickerCallback = null;
  let debounceSaveTimer = null;

  const MAX_HISTORY = 50;
  const historyStack = [JSON.parse(JSON.stringify(workingData))];
  let historyIndex = 0;

  // DOM Elements
  const adminSidebar = document.getElementById('admin-sidebar');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const adminCurrentSection = document.getElementById('admin-current-section');
  const btnUndo = document.getElementById('btn-undo');
  const btnRedo = document.getElementById('btn-redo');
  const btnPublishAll = document.getElementById('btn-publish-all');
  const syncStatusPill = document.getElementById('sync-status-pill');
  const toastContainer = document.getElementById('toast-container');

  // Counters
  const countArticles = document.getElementById('count-articles');
  const countTracks = document.getElementById('count-tracks');
  const countMedia = document.getElementById('media-count');

  // Modals
  const mediaPickerModal = document.getElementById('media-picker-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalPickerBackdrop = document.getElementById('modal-picker-backdrop');

  /* --------------------------------------------------------------------------
     Draft Persistence, Undo/Redo History & Explicit Publish
     -------------------------------------------------------------------------- */
  function pushHistorySnapshot(snapshot) {
    const serialized = JSON.stringify(snapshot);
    if (historyIndex >= 0 && JSON.stringify(historyStack[historyIndex]) === serialized) {
      return;
    }
    historyStack.splice(historyIndex + 1);
    historyStack.push(JSON.parse(JSON.stringify(snapshot)));
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    } else {
      historyIndex = historyStack.length - 1;
    }
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    if (btnUndo) btnUndo.disabled = historyIndex <= 0;
    if (btnRedo) btnRedo.disabled = historyIndex >= historyStack.length - 1;
  }

  function updatePublishStatusUI() {
    const isUnpublished = window.YBStore ? window.YBStore.hasUnpublishedChanges(workingData) : false;
    if (syncStatusPill) {
      syncStatusPill.textContent = isUnpublished ? 'Unpublished changes' : 'Published';
      syncStatusPill.classList.toggle('is-dirty', isUnpublished);
    }
    if (btnPublishAll) {
      btnPublishAll.textContent = isUnpublished ? 'Publish Changes' : 'Published';
      btnPublishAll.disabled = !isUnpublished;
    }
  }

  function saveDraftOnly(data) {
    const payload = data || workingData;
    if (window.YBStore) {
      window.YBStore.saveDraft(payload);
    }
    updatePublishStatusUI();
  }

  function commitChanges(toastMessage) {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    saveDraftOnly(workingData);
    pushHistorySnapshot(workingData);
    if (toastMessage) {
      showToast(`${toastMessage} (Draft)`);
    }
  }

  function scheduleCommitChanges() {
    if (syncStatusPill) {
      syncStatusPill.textContent = 'Unpublished changes';
      syncStatusPill.classList.add('is-dirty');
    }
    if (btnPublishAll) {
      btnPublishAll.textContent = 'Publish Changes';
      btnPublishAll.disabled = false;
    }
    if (debounceSaveTimer) clearTimeout(debounceSaveTimer);
    debounceSaveTimer = setTimeout(() => {
      debounceSaveTimer = null;
      saveDraftOnly(workingData);
      pushHistorySnapshot(workingData);
    }, 350);
  }

  function refreshActiveView() {
    if (currentTab === 'articles') renderArticles();
    else if (currentTab === 'tracks') renderTracks();
    else if (currentTab === 'about') populateAboutForm();
    else if (currentTab === 'settings') populateSettingsForm();
    else if (currentTab === 'media') renderMediaLibrary();
  }

  function performUndo() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    if (historyIndex <= 0) return;
    historyIndex--;
    workingData = JSON.parse(JSON.stringify(historyStack[historyIndex]));
    saveDraftOnly(workingData);
    updateHistoryButtons();
    refreshActiveView();
    showToast('Undid last draft change');
  }

  function performRedo() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    if (historyIndex >= historyStack.length - 1) return;
    historyIndex++;
    workingData = JSON.parse(JSON.stringify(historyStack[historyIndex]));
    saveDraftOnly(workingData);
    updateHistoryButtons();
    refreshActiveView();
    showToast('Redid draft change');
  }

  function publishChanges() {
    if (debounceSaveTimer) {
      clearTimeout(debounceSaveTimer);
      debounceSaveTimer = null;
    }
    pushHistorySnapshot(workingData);
    if (window.YBStore) {
      const ok = window.YBStore.publish(workingData);
      if (ok) {
        updatePublishStatusUI();
        showToast('Published! Changes are now live on the website.', 'success');
      } else {
        showToast('Failed to save changes. Browser storage quota may be exceeded.', 'error');
      }
    }
  }

  /* --------------------------------------------------------------------------
     1. Toast Notifications
     -------------------------------------------------------------------------- */
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : '⚠'}</span>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /* --------------------------------------------------------------------------
     2. Tab Navigation
     -------------------------------------------------------------------------- */
  function switchTab(tabName) {
    currentTab = tabName;

    // Update Nav buttons
    document.querySelectorAll('.admin-nav__item').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update Panels
    document.querySelectorAll('.admin-panel').forEach(panel => {
      panel.classList.toggle('is-active', panel.id === `panel-${tabName}`);
    });

    // Update Breadcrumb
    const labels = {
      articles: 'Articles Archive',
      tracks: 'Audio Jukebox',
      about: 'About & Manifesto',
      settings: 'Site Settings',
      media: 'Media & Backups'
    };
    if (adminCurrentSection) {
      adminCurrentSection.textContent = labels[tabName] || 'Studio';
    }

    // Close mobile sidebar if open
    if (adminSidebar) {
      adminSidebar.classList.remove('is-open');
    }
  }

  document.querySelectorAll('.admin-nav__item').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  if (btnToggleSidebar && adminSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      adminSidebar.classList.toggle('is-open');
    });
  }

  /* --------------------------------------------------------------------------
     3. Articles Manager
     -------------------------------------------------------------------------- */
  const articleCardsContainer = document.getElementById('article-cards-container');
  const articleSearch = document.getElementById('article-search');
  const articleFilterMonth = document.getElementById('article-filter-month');
  const btnAddArticle = document.getElementById('btn-add-article');

  function renderArticles() {
    if (!articleCardsContainer) return;

    const query = (articleSearch?.value || '').toLowerCase().trim();
    const filterMonth = articleFilterMonth?.value || 'ALL';

    const articles = workingData.articles || [];
    if (countArticles) countArticles.textContent = articles.length;

    const filtered = articles.filter(a => {
      const matchQuery = !query || 
        (a.title || '').toLowerCase().includes(query) || 
        (a.tag || '').toLowerCase().includes(query) ||
        (a.slug || '').toLowerCase().includes(query);
      const matchMonth = filterMonth === 'ALL' || a.month === filterMonth;
      return matchQuery && matchMonth;
    });

    if (filtered.length === 0) {
      articleCardsContainer.innerHTML = `
        <div style="padding: 3rem; text-align: center; color: var(--admin-text-muted);">
          <p>No articles match the current filter or search criteria.</p>
        </div>
      `;
      return;
    }

    articleCardsContainer.innerHTML = filtered.map(a => `
      <div class="article-edit-card" data-id="${escapeHtml(a.id)}">
        <div class="article-edit-card__cover">
          <img src="${escapeHtml(a.cover || './assets/images/cover-01.svg')}" alt="" class="article-edit-card__thumb" id="thumb-${escapeHtml(a.id)}" />
          <button type="button" class="btn btn--subtle btn-change-cover" data-id="${escapeHtml(a.id)}" style="font-size: 0.75rem; padding: 0.35rem 0.5rem; width: 100%;">
            Change Image
          </button>
        </div>

        <div class="article-edit-card__fields">
          <div class="fields-row fields-row--3">
            <div class="form-group">
              <label>Title</label>
              <input type="text" class="field-title" data-id="${escapeHtml(a.id)}" value="${escapeHtml(a.title || '')}" />
            </div>
            <div class="form-group">
              <label>Month</label>
              <select class="field-month" data-id="${escapeHtml(a.id)}">
                ${['MARCH', 'FEBRUARY', 'JANUARY', 'DECEMBER', 'NOVEMBER', 'OCTOBER', 'SEPTEMBER', 'AUGUST', 'JULY', 'JUNE', 'MAY', 'APRIL']
                  .map(m => `<option value="${m}" ${a.month === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Category Tag</label>
              <select class="field-tag" data-id="${escapeHtml(a.id)}">
                ${['INSPIRE', 'SHOWCASE', 'EDUCATE']
                  .map(t => `<option value="${t}" ${a.tag === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="fields-row fields-row--meta">
            <div class="form-group">
              <label>Slug</label>
              <input type="text" class="field-slug" data-id="${escapeHtml(a.id)}" value="${escapeHtml(a.slug || '')}" />
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" class="field-date" data-id="${escapeHtml(a.id)}" value="${escapeHtml(a.date || '')}" />
            </div>
            <div class="form-group">
              <label>Source URL (External Link)</label>
              <input type="url" class="field-url" data-id="${escapeHtml(a.id)}" value="${escapeHtml(a.url || '')}" placeholder="https://..." />
            </div>
          </div>

          <div class="form-group">
            <label>Excerpt / Short Summary</label>
            <input type="text" class="field-excerpt" data-id="${escapeHtml(a.id)}" value="${escapeHtml(a.excerpt || '')}" />
          </div>

          <div class="form-group">
            <label>Rich Content (HTML allowed)</label>
            <textarea class="field-content" data-id="${escapeHtml(a.id)}" rows="3">${escapeHtml(a.content || '')}</textarea>
          </div>

          <div class="article-edit-card__actions">
            <button type="button" class="btn btn--subtle btn-dup-article" data-id="${escapeHtml(a.id)}">Duplicate</button>
            <button type="button" class="btn btn--danger btn-del-article" data-id="${escapeHtml(a.id)}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    bindArticleCardEvents();
  }

  function bindArticleCardEvents() {
    // Inputs change binding
    articleCardsContainer.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('input', () => {
        const id = input.dataset.id;
        const article = (workingData.articles || []).find(a => a.id === id);
        if (!article) return;

        if (input.classList.contains('field-title')) article.title = input.value;
        if (input.classList.contains('field-month')) article.month = input.value;
        if (input.classList.contains('field-tag')) article.tag = input.value;
        if (input.classList.contains('field-slug')) article.slug = input.value;
        if (input.classList.contains('field-date')) article.date = input.value;
        if (input.classList.contains('field-url')) article.url = input.value;
        if (input.classList.contains('field-excerpt')) article.excerpt = input.value;
        if (input.classList.contains('field-content')) article.content = input.value;
        scheduleCommitChanges();
      });
    });

    // Change cover image
    articleCardsContainer.querySelectorAll('.btn-change-cover').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        openMediaPicker((selectedUrl) => {
          const article = (workingData.articles || []).find(a => a.id === id);
          if (article) {
            article.cover = selectedUrl;
            const thumb = document.getElementById(`thumb-${id}`);
            if (thumb) thumb.src = selectedUrl;
            commitChanges('Article cover updated');
          }
        });
      });
    });

    // Duplicate
    articleCardsContainer.querySelectorAll('.btn-dup-article').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const article = (workingData.articles || []).find(a => a.id === id);
        if (!article) return;

        const clone = JSON.parse(JSON.stringify(article));
        clone.id = 'art_' + Date.now();
        clone.slug = clone.slug + '-copy';
        clone.title = clone.title + ' (Copy)';
        workingData.articles.unshift(clone);
        renderArticles();
        commitChanges('Article duplicated');
      });
    });

    // Delete
    articleCardsContainer.querySelectorAll('.btn-del-article').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (confirm('Are you sure you want to delete this article?')) {
          workingData.articles = (workingData.articles || []).filter(a => a.id !== id);
          renderArticles();
          commitChanges('Article deleted');
        }
      });
    });
  }

  // Debounce search input to prevent DOM thrashing on every keystroke
  let searchDebounceTimer = null;
  if (articleSearch) {
    articleSearch.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(renderArticles, 200);
    });
  }
  if (articleFilterMonth) articleFilterMonth.addEventListener('change', renderArticles);

  if (btnAddArticle) {
    btnAddArticle.addEventListener('click', () => {
      const newArt = {
        id: 'art_' + Date.now(),
        index: (workingData.articles || []).length + 1,
        title: 'New Editorial Drop',
        slug: 'new-editorial-drop-' + Date.now().toString().slice(-4),
        month: 'MARCH',
        tag: 'INSPIRE',
        date: new Date().toISOString().slice(0, 10),
        cover: './assets/images/cover-01.svg',
        url: 'https://edvlabs.example',
        excerpt: 'New story entry in The Yearbook archive.',
        content: '<p>Fresh studio entry exploring new creative horizons.</p>'
      };
      if (!workingData.articles) workingData.articles = [];
      workingData.articles.unshift(newArt);
      renderArticles();
      commitChanges('New article added');
    });
  }

  /* --------------------------------------------------------------------------
     4. Audio Jukebox Manager
     -------------------------------------------------------------------------- */
  const trackCardsContainer = document.getElementById('track-cards-container');
  const btnAddTrack = document.getElementById('btn-add-track');

  function renderTracks() {
    if (!trackCardsContainer) return;
    const tracks = workingData.tracks || [];
    if (countTracks) countTracks.textContent = tracks.length;

    trackCardsContainer.innerHTML = tracks.map((t, idx) => `
      <div class="track-edit-card" data-index="${idx}">
        <img src="${escapeHtml(t.thumbnail || './assets/images/favicon.svg')}" alt="" class="track-edit-card__thumb btn-change-track-thumb" data-index="${idx}" title="Click to change thumbnail" />
        <div class="track-edit-card__fields">
          <div class="form-group">
            <label>Title</label>
            <input type="text" class="field-track-title" data-index="${idx}" value="${escapeHtml(t.title || '')}" />
          </div>
          <div class="form-group">
            <label>Artist</label>
            <input type="text" class="field-track-artist" data-index="${idx}" value="${escapeHtml(t.artist || '')}" />
          </div>
          <div class="form-group">
            <label>Audio MP3 URL</label>
            <input type="url" class="field-track-url" data-index="${idx}" value="${escapeHtml(t.audioUrl || '')}" placeholder="https://..." />
          </div>
        </div>
        <div class="track-edit-card__actions">
          <button type="button" class="btn-icon btn-track-up" data-index="${idx}" title="Move Up" ${idx === 0 ? 'disabled style=\"opacity:0.3\"' : ''}>▲</button>
          <button type="button" class="btn-icon btn-track-down" data-index="${idx}" title="Move Down" ${idx === tracks.length - 1 ? 'disabled style=\"opacity:0.3\"' : ''}>▼</button>
          <button type="button" class="btn-icon btn-track-del" data-index="${idx}" title="Delete Track" style="color:var(--admin-danger);">✕</button>
        </div>
      </div>
    `).join('');

    bindTrackCardEvents();
  }

  function bindTrackCardEvents() {
    trackCardsContainer.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.index, 10);
        const track = (workingData.tracks || [])[idx];
        if (!track) return;

        if (input.classList.contains('field-track-title')) track.title = input.value;
        if (input.classList.contains('field-track-artist')) track.artist = input.value;
        if (input.classList.contains('field-track-url')) track.audioUrl = input.value;
        scheduleCommitChanges();
      });
    });

    trackCardsContainer.querySelectorAll('.btn-change-track-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const idx = parseInt(thumb.dataset.index, 10);
        openMediaPicker((url) => {
          const track = (workingData.tracks || [])[idx];
          if (track) {
            track.thumbnail = url;
            thumb.src = url;
            commitChanges('Track thumbnail updated');
          }
        });
      });
    });

    trackCardsContainer.querySelectorAll('.btn-track-up').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (idx > 0) {
          const temp = workingData.tracks[idx];
          workingData.tracks[idx] = workingData.tracks[idx - 1];
          workingData.tracks[idx - 1] = temp;
          renderTracks();
          commitChanges('Track reordered');
        }
      });
    });

    trackCardsContainer.querySelectorAll('.btn-track-down').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (idx < workingData.tracks.length - 1) {
          const temp = workingData.tracks[idx];
          workingData.tracks[idx] = workingData.tracks[idx + 1];
          workingData.tracks[idx + 1] = temp;
          renderTracks();
          commitChanges('Track reordered');
        }
      });
    });

    trackCardsContainer.querySelectorAll('.btn-track-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (confirm('Delete this track?')) {
          workingData.tracks.splice(idx, 1);
          renderTracks();
          commitChanges('Track deleted');
        }
      });
    });
  }

  if (btnAddTrack) {
    btnAddTrack.addEventListener('click', () => {
      const newTrack = {
        id: 'track_' + Date.now(),
        title: 'New Track',
        artist: 'edvlabs Sound',
        audioUrl: '',
        thumbnail: './assets/images/favicon.svg'
      };
      if (!workingData.tracks) workingData.tracks = [];
      workingData.tracks.push(newTrack);
      renderTracks();
      commitChanges('Track added');
    });
  }

  /* --------------------------------------------------------------------------
     5. About Page & Manifesto Form
     -------------------------------------------------------------------------- */
  function populateAboutForm() {
    const about = workingData.about || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('about-badge-left', about.badgeLeft);
    setVal('about-badge-right', about.badgeRight);
    setVal('about-title-input', about.title);
    setVal('about-year-input', about.yearLabel);
    setVal('about-video-url', about.videoSrc);
    setVal('about-hero-heading-input', about.heroHeading);
    setVal('about-manifesto-1-input', about.manifesto1);
    setVal('about-manifesto-2-input', about.manifesto2);
    setVal('about-thanks-input', about.thanksHeading);
    setVal('about-tagline-input', about.tagline);
    setVal('about-copyright-input', about.copyright);
    setVal('about-email-input', about.contactEmail);

    // Pillars
    const pillarsContainer = document.getElementById('about-pillars-form');
    if (pillarsContainer && about.pillars) {
      pillarsContainer.innerHTML = about.pillars.map((p, idx) => `
        <div class="fields-row fields-row--3" style="margin-bottom: 0.75rem;">
          <input type="text" class="pillar-field-num" data-index="${idx}" value="${escapeHtml(p.num || '')}" placeholder="e.g. (1)" />
          <input type="text" class="pillar-field-title" data-index="${idx}" value="${escapeHtml(p.title || '')}" placeholder="Title" />
          <textarea class="pillar-field-text" data-index="${idx}" rows="2" placeholder="Description">${escapeHtml(p.text || '')}</textarea>
        </div>
      `).join('');

      pillarsContainer.querySelectorAll('input, textarea').forEach(el => {
        el.addEventListener('input', () => {
          const idx = parseInt(el.dataset.index, 10);
          const pillar = workingData.about.pillars[idx];
          if (!pillar) return;
          if (el.classList.contains('pillar-field-num')) pillar.num = el.value;
          if (el.classList.contains('pillar-field-title')) pillar.title = el.value;
          if (el.classList.contains('pillar-field-text')) pillar.text = el.value;
          scheduleCommitChanges();
        });
      });
    }

    // Bind inputs to workingData
    const formAbout = document.getElementById('form-about');
    if (formAbout) {
      formAbout.addEventListener('input', (e) => {
        if (!workingData.about) workingData.about = {};
        const name = e.target.name;
        if (name) {
          workingData.about[name] = e.target.value;
          scheduleCommitChanges();
        }
      });
    }

    const btnPickVideo = document.getElementById('btn-pick-about-video');
    if (btnPickVideo) {
      btnPickVideo.addEventListener('click', () => {
        openMediaPicker((url) => {
          workingData.about.videoSrc = url;
          setVal('about-video-url', url);
          commitChanges('About video updated');
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
     6. Site Settings & Branding Form
     -------------------------------------------------------------------------- */
  function populateSettingsForm() {
    const meta = workingData.meta || {};
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('setting-site-title', meta.siteTitle);
    setVal('setting-description', meta.description);
    setVal('setting-header-1', meta.headerTitle);
    setVal('setting-header-2', meta.headerSubtitle);
    setVal('setting-header-3', meta.headerYear);

    const cbNoise = document.getElementById('setting-noise-overlay');
    if (cbNoise) cbNoise.checked = !!meta.noiseOverlay;

    const cbSound = document.getElementById('setting-sound-default');
    if (cbSound) cbSound.checked = !!meta.soundEnabledByDefault;

    const formSettings = document.getElementById('form-settings');
    if (formSettings) {
      formSettings.addEventListener('input', (e) => {
        if (!workingData.meta) workingData.meta = {};
        const name = e.target.name;
        if (e.target.type === 'checkbox') {
          workingData.meta[name] = e.target.checked;
        } else if (name) {
          workingData.meta[name] = e.target.value;
        }
        scheduleCommitChanges();
      });
    }
  }

  /* --------------------------------------------------------------------------
     7. Media Library & File Uploads
     -------------------------------------------------------------------------- */
  const mediaLibraryGrid = document.getElementById('media-library-grid');
  const uploadZone = document.getElementById('upload-zone');
  const mediaFileInput = document.getElementById('media-file-input');
  const btnBrowseFile = document.getElementById('btn-browse-file');

  function renderMediaLibrary() {
    if (!mediaLibraryGrid) return;
    const library = window.YBStore ? window.YBStore.getMediaLibrary() : [];
    if (countMedia) countMedia.textContent = library.length;

    mediaLibraryGrid.innerHTML = library.map((item, idx) => `
      <div class="media-item" title="Click to copy path: ${escapeHtml(item.path)}" data-path="${escapeHtml(item.path)}">
        <img src="${escapeHtml(item.path)}" alt="${escapeHtml(item.label)}" loading="lazy" />
        <span class="media-item__caption">${escapeHtml(item.label)}</span>
      </div>
    `).join('');

    mediaLibraryGrid.querySelectorAll('.media-item').forEach(el => {
      el.addEventListener('click', () => {
        const path = el.dataset.path;
        navigator.clipboard?.writeText(path);
        showToast(`Copied path: ${path}`);
      });
    });
  }

  // Automatic Client-Side Image Resizing & WebP Compression
  function resizeAndCompressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image data'));
        img.onload = () => {
          let w = img.width;
          let h = img.height;

          // Downscale proportionally if larger than maximum dimension bounds
          if (w > maxWidth || h > maxHeight) {
            if (w / h > maxWidth / maxHeight) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            } else {
              w = Math.round((w * maxHeight) / h);
              h = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          // Try exporting to WebP first, fallback to JPEG
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/webp', quality);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
          } catch (e) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    showToast('Optimizing and compressing image...', 'info');

    try {
      // Auto-downscale to max 1600px and compress to lightweight WebP (<150KB)
      const compressedDataUrl = await resizeAndCompressImage(file, 1600, 1600, 0.82);
      const label = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const newMedia = { path: compressedDataUrl, label, category: 'Uploads' };

      // Save to IndexedDB to avoid breaking localStorage quota
      if (window.YBStore && typeof window.YBStore.addMediaItem === 'function') {
        window.YBStore.addMediaItem(newMedia, () => {
          renderMediaLibrary();
          showToast(`Optimized & saved "${file.name}" to IndexedDB`);
          if (callback) callback(compressedDataUrl);
        });
      } else {
        if (window.YB_MEDIA_LIBRARY) {
          window.YB_MEDIA_LIBRARY.unshift(newMedia);
        }
        renderMediaLibrary();
        showToast(`Uploaded "${file.name}"`);
        if (callback) callback(compressedDataUrl);
      }
    } catch (err) {
      console.error('[Admin] Image processing failed:', err);
      showToast('Image processing failed: ' + (err.message || 'unknown error'), 'error');
    }
  }

  if (btnBrowseFile && mediaFileInput) {
    btnBrowseFile.addEventListener('click', () => mediaFileInput.click());
    mediaFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageUpload(e.target.files[0]);
      }
    });
  }

  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('is-dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('is-dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('is-dragover');
      if (e.dataTransfer?.files?.[0]) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    });
  }

  /* --------------------------------------------------------------------------
     8. Reusable Media Picker Modal
     -------------------------------------------------------------------------- */
  const pickerLibraryGrid = document.getElementById('picker-library-grid');
  const pickerUrlInput = document.getElementById('picker-url-input');
  const btnConfirmUrl = document.getElementById('btn-confirm-url');
  const pickerFileInput = document.getElementById('picker-file-input');
  const btnBrowsePickerFile = document.getElementById('btn-browse-picker-file');

  function openMediaPicker(onSelect) {
    activeMediaPickerCallback = onSelect;
    if (mediaPickerModal) {
      mediaPickerModal.classList.add('is-open');
      mediaPickerModal.setAttribute('aria-hidden', 'false');
    }
    renderPickerLibrary();
  }

  function closeMediaPicker() {
    activeMediaPickerCallback = null;
    if (mediaPickerModal) {
      mediaPickerModal.classList.remove('is-open');
      mediaPickerModal.setAttribute('aria-hidden', 'true');
    }
  }

  function renderPickerLibrary() {
    if (!pickerLibraryGrid) return;
    const library = window.YBStore ? window.YBStore.getMediaLibrary() : [];

    pickerLibraryGrid.innerHTML = library.map(item => `
      <img src="${escapeHtml(item.path)}" alt="${escapeHtml(item.label)}" class="picker-thumb" data-path="${escapeHtml(item.path)}" title="${escapeHtml(item.label)}" />
    `).join('');

    pickerLibraryGrid.querySelectorAll('.picker-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const path = thumb.dataset.path;
        if (activeMediaPickerCallback) activeMediaPickerCallback(path);
        closeMediaPicker();
      });
    });
  }

  // Picker tab switcher
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.pickerTab;
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('is-active', t === tab));
      document.querySelectorAll('.picker-view').forEach(v => v.classList.toggle('is-active', v.id === `picker-view-${target}`));
    });
  });

  if (btnConfirmUrl && pickerUrlInput) {
    btnConfirmUrl.addEventListener('click', () => {
      const url = pickerUrlInput.value.trim();
      if (url && activeMediaPickerCallback) {
        activeMediaPickerCallback(url);
        closeMediaPicker();
      }
    });
  }

  if (btnBrowsePickerFile && pickerFileInput) {
    btnBrowsePickerFile.addEventListener('click', () => pickerFileInput.click());
    pickerFileInput.addEventListener('change', (e) => {
      if (e.target.files?.[0]) {
        handleImageUpload(e.target.files[0], (dataUrl) => {
          if (activeMediaPickerCallback) activeMediaPickerCallback(dataUrl);
          closeMediaPicker();
        });
      }
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeMediaPicker);
  if (modalPickerBackdrop) modalPickerBackdrop.addEventListener('click', closeMediaPicker);

  /* --------------------------------------------------------------------------
     9. Undo, Redo, Publish, Export & Import
     -------------------------------------------------------------------------- */
  if (btnUndo) {
    btnUndo.addEventListener('click', performUndo);
  }

  if (btnRedo) {
    btnRedo.addEventListener('click', performRedo);
  }

  if (btnPublishAll) {
    btnPublishAll.addEventListener('click', publishChanges);
  }

  // Global Keyboard Shortcuts
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

  // Prevent form Enter submit reload
  const formAbout = document.getElementById('form-about');
  if (formAbout) {
    formAbout.addEventListener('submit', (e) => e.preventDefault());
  }
  const formSettings = document.getElementById('form-settings');
  if (formSettings) {
    formSettings.addEventListener('submit', (e) => e.preventDefault());
  }

  // Export JSON
  const btnExportJson = document.getElementById('btn-export-json');
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const jsonStr = JSON.stringify(workingData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `the-yearbook-content-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Downloaded JSON content backup');
    });
  }

  // Import JSON with robust validation and prototype protection
  const btnTriggerImportJson = document.getElementById('btn-trigger-import-json');
  const importJsonInput = document.getElementById('import-json-input');
  if (btnTriggerImportJson && importJsonInput) {
    btnTriggerImportJson.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          if (window.YBStore) {
            const success = window.YBStore.importJSON(ev.target.result);
            if (success) {
              workingData = window.YBStore.loadDraft();
              renderArticles();
              renderTracks();
              populateAboutForm();
              populateSettingsForm();
              pushHistorySnapshot(workingData);
              updatePublishStatusUI();
              showToast('Imported, validated & published content successfully!', 'success');
            } else {
              showToast('Failed to import JSON data.', 'error');
            }
          }
        } catch (err) {
          showToast('Invalid JSON file format: ' + (err.message || 'Validation error'), 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  // Reset to default
  const btnResetDefault = document.getElementById('btn-reset-default');
  if (btnResetDefault) {
    btnResetDefault.addEventListener('click', () => {
      if (confirm('Are you sure you want to discard all changes and reset to factory content? This action cannot be undone.')) {
        if (window.YBStore) {
          workingData = window.YBStore.reset();
          renderArticles();
          renderTracks();
          populateAboutForm();
          populateSettingsForm();
          pushHistorySnapshot(workingData);
          updatePublishStatusUI();
          showToast('Reset to original default content!');
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     10. Utility Functions (Consolidated with YBStore)
     -------------------------------------------------------------------------- */
  function escapeHtml(str) {
    if (window.YBStore && typeof window.YBStore.escapeHtml === 'function') {
      return window.YBStore.escapeHtml(str);
    }
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  /* --------------------------------------------------------------------------
     11. Initialize Studio
     -------------------------------------------------------------------------- */
  renderArticles();
  renderTracks();
  populateAboutForm();
  populateSettingsForm();
  renderMediaLibrary();
  updateHistoryButtons();
  updatePublishStatusUI();

})();
