/**
 * edvlabs — THE YEARBOOK Interactive Frontend Runtime (`app.js`)
 */

(function () {
  'use strict';

  // State Management
  let siteData = window.YBStore ? window.YBStore.get() : {};
  let currentView = 'timeline';
  let activeArticleSlug = null;

  // Audio Engine State
  let isSoundEnabled = false;
  let isAudioPlaying = false;
  let currentTrackIndex = 0;
  const audioElement = document.getElementById('site-audio');
  const clickAudio = new Audio('./assets/audio/click.wav');
  const fxAudio = new Audio('./assets/audio/fx.wav');

  // DOM Elements
  const soundGate = document.getElementById('sound-gate');
  const btnEnterSound = document.getElementById('btn-enter-sound');
  const btnEnterSilent = document.getElementById('btn-enter-silent');
  const siteNav = document.querySelector('.site-nav');
  const mobileNav = document.getElementById('mobile-nav');
  const audioPill = document.getElementById('audio-pill');
  const audioPlayToggle = document.getElementById('audio-play-toggle');
  const audioMarqueeText = document.getElementById('audio-marquee-text');
  const audioTracklist = document.getElementById('audio-tracklist');
  const audioTrackCount = document.getElementById('audio-track-count');

  // Views DOM
  const viewTimeline = document.getElementById('view-timeline');
  const viewSurf = document.getElementById('view-surf');
  const viewArticles = document.getElementById('view-articles');
  const viewAbout = document.getElementById('view-about');
  const timelineTrack = document.getElementById('timeline-track');
  const timelineViewport = document.getElementById('timeline-viewport');
  const rulerTicks = document.getElementById('timeline-ruler-ticks');
  const rulerMonths = document.getElementById('timeline-ruler-months');
  const surfRibbon = document.getElementById('surf-ribbon');
  const surfContainer = document.getElementById('surf-container');
  const indexGrid = document.getElementById('index-grid');

  // Article Drawer DOM
  const articleDrawer = document.getElementById('article-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerBtnClose = document.getElementById('drawer-btn-close');
  const drawerBadgeTag = document.getElementById('drawer-badge-tag');
  const drawerBadgeMonth = document.getElementById('drawer-badge-month');
  const drawerSourceLink = document.getElementById('drawer-source-link');
  const drawerTitle = document.getElementById('drawer-title');
  const drawerMedia = document.getElementById('drawer-media');
  const drawerBody = document.getElementById('drawer-body');

  /* --------------------------------------------------------------------------
     1. Sound Effects & Micro-Interactions
     -------------------------------------------------------------------------- */
  function playClick() {
    if (!isSoundEnabled) return;
    try {
      clickAudio.currentTime = 0;
      clickAudio.volume = 0.35;
      clickAudio.play().catch(() => {});
    } catch (e) {}
  }

  function playFx() {
    if (!isSoundEnabled) return;
    try {
      fxAudio.currentTime = 0;
      fxAudio.volume = 0.4;
      fxAudio.play().catch(() => {});
    } catch (e) {}
  }

  // Bind click sound to all interactive elements
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button, .timeline-card, .surf-card, .index-card')) {
      playClick();
    }
  });

  /* --------------------------------------------------------------------------
     2. Audio Jukebox Engine
     -------------------------------------------------------------------------- */
  let audioPlayerListenersBound = false;
  function initAudioPlayer() {
    const tracks = siteData.tracks || [];
    if (!tracks.length) return;

    if (audioTrackCount) audioTrackCount.textContent = tracks.length;

    // Render dropdown tracklist
    if (audioTracklist) {
      audioTracklist.innerHTML = tracks.map((track, idx) => `
        <button type="button" class="track-item ${idx === currentTrackIndex ? 'is-active' : ''}" data-index="${idx}">
          <img src="${escapeHtml(sanitizeUrl(track.thumbnail, true) || './assets/images/favicon.svg')}" alt="" class="track-thumb" />
          <div class="track-meta">
            <span class="track-title">${escapeHtml(track.title)}</span>
            <span class="track-artist">${escapeHtml(track.artist)}</span>
          </div>
        </button>
      `).join('');

      audioTracklist.querySelectorAll('.track-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          switchTrack(idx, true);
        });
      });
    }

    updateCurrentTrackDisplay();

    // Player events - attach only once to prevent memory leaks and stacked handlers
    if (!audioPlayerListenersBound) {
      audioPlayerListenersBound = true;
      if (audioPlayToggle) {
        audioPlayToggle.addEventListener('click', toggleAudioPlayback);
      }

      if (audioElement) {
        audioElement.addEventListener('ended', () => {
          const nextIdx = (currentTrackIndex + 1) % (siteData.tracks || []).length;
          switchTrack(nextIdx, true);
        });

        audioElement.addEventListener('play', () => {
          isAudioPlaying = true;
          if (audioPill) {
            audioPill.classList.add('is-playing');
            audioPill.classList.remove('is-paused');
          }
        });

        audioElement.addEventListener('pause', () => {
          isAudioPlaying = false;
          if (audioPill) {
            audioPill.classList.remove('is-playing');
            audioPill.classList.add('is-paused');
          }
        });
      }
    }
  }

  function updateCurrentTrackDisplay() {
    const tracks = siteData.tracks || [];
    const track = tracks[currentTrackIndex];
    if (!track) return;

    if (audioMarqueeText) {
      const text = `${track.artist} - ${track.title} / `;
      audioMarqueeText.innerHTML = `<span>${text.repeat(4)}</span>`;
    }

    if (audioTracklist) {
      audioTracklist.querySelectorAll('.track-item').forEach((item, idx) => {
        item.classList.toggle('is-active', idx === currentTrackIndex);
      });
    }
  }

  function switchTrack(index, playImmediately = false) {
    const tracks = siteData.tracks || [];
    if (index < 0 || index >= tracks.length) return;

    currentTrackIndex = index;
    const track = tracks[currentTrackIndex];
    updateCurrentTrackDisplay();

    if (audioElement && track.audioUrl) {
      audioElement.src = track.audioUrl;
      if (playImmediately && isSoundEnabled) {
        audioElement.play().catch(err => {
          console.warn('Playback interrupted:', err);
        });
      }
    }
  }

  function toggleAudioPlayback() {
    if (!audioElement) return;
    if (audioElement.paused) {
      isSoundEnabled = true;
      if (!audioElement.src && siteData.tracks && siteData.tracks[currentTrackIndex]) {
        audioElement.src = siteData.tracks[currentTrackIndex].audioUrl;
      }
      audioElement.play().catch(() => {});
    } else {
      audioElement.pause();
    }
  }

  /* --------------------------------------------------------------------------
     3. Sound Gate Intro & Stats
     -------------------------------------------------------------------------- */
  function initSoundGate() {
    const statsContainer = document.getElementById('sound-gate-stats');
    if (statsContainer) {
      // Calculate monthly stats from articles
      const articles = siteData.articles || [];
      const monthMap = {};
      articles.forEach(a => {
        const m = a.month || 'OTHER';
        if (!monthMap[m]) monthMap[m] = { articles: 0, inspiration: 0, showcase: 0 };
        monthMap[m].articles++;
        if (a.tag === 'INSPIRE') monthMap[m].inspiration++;
        if (a.tag === 'SHOWCASE') monthMap[m].showcase++;
      });

      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      statsContainer.innerHTML = months.map(m => {
        const count = monthMap[m]?.articles || 0;
        return `
          <div class="sound-gate__month-col">
            <strong>${m}</strong>
            <span>ARTICLES (${count})</span>
            <span>MUSIC (${siteData.tracks?.length || 15})</span>
          </div>
        `;
      }).join('');
    }

    if (btnEnterSound) {
      btnEnterSound.addEventListener('click', () => {
        isSoundEnabled = true;
        soundGate.classList.add('is-hidden');
        document.body.classList.remove('is-loading');
        playFx();
        switchTrack(currentTrackIndex, true);
      });
    }

    if (btnEnterSilent) {
      btnEnterSilent.addEventListener('click', () => {
        isSoundEnabled = false;
        soundGate.classList.add('is-hidden');
        document.body.classList.remove('is-loading');
      });
    }
  }

  /* --------------------------------------------------------------------------
     4. Navigation & View Routing
     -------------------------------------------------------------------------- */
  function switchView(viewName) {
    if (currentView === viewName) return;
    currentView = viewName;
    playFx();

    // Toggle active section
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('is-active', sec.dataset.view === viewName);
    });

    // Update Desktop Nav
    document.querySelectorAll('.site-nav .nav-link').forEach(link => {
      link.classList.toggle('is-active', link.dataset.view === viewName);
    });

    // Update Mobile Nav
    document.querySelectorAll('.mobile-nav__btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === viewName);
    });

    // Handle branding appearance per view
    const branding = document.getElementById('site-branding');
    if (branding) {
      if (viewName === 'about') {
        branding.style.opacity = '0';
        branding.style.pointerEvents = 'none';
      } else {
        branding.style.opacity = '1';
        branding.style.pointerEvents = 'auto';
      }
    }

    // Close drawer if open when switching views
    closeArticleDrawer();

    if (viewName === 'surf') {
      startSurfAnimation();
    } else {
      stopSurfAnimation();
    }

    if (viewName === 'about') {
      document.body.classList.add('is-about');
      startAboutAnimation();
    } else {
      document.body.classList.remove('is-about');
      stopAboutAnimation();
    }
  }

  function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (!hash || hash === 'timeline') {
      switchView('timeline');
    } else if (hash === 'surf') {
      switchView('surf');
    } else if (hash === 'articles') {
      switchView('articles');
    } else if (hash === 'about') {
      switchView('about');
    } else if (hash.startsWith('articles/')) {
      const slug = hash.replace('articles/', '');
      openArticleDrawer(slug);
    }
  }

  /* --------------------------------------------------------------------------
     5. Timeline View Controller (Smooth Inertia & Wheel Physics)
     -------------------------------------------------------------------------- */
  let timelineTargetX = 0;
  let timelineCurrentX = 0;
  let timelineMaxX = 0;
  let timelineAnimId = null;
  let currentActiveMonth = '';
  let cachedTimelineCards = [];
  let cachedTimelineMedia = [];
  let cachedCardPositions = [];

  const MONTH_NAMES = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  function getArticleDateInfo(article) {
    let year = 2026;
    let monthIdx = 2; // Default to March

    if (article.date && typeof article.date === 'string') {
      const parts = article.date.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y)) year = y;
        if (!isNaN(m) && m >= 1 && m <= 12) monthIdx = m - 1;
      }
    } else if (article.year) {
      year = parseInt(article.year, 10) || 2026;
    }

    if (article.month) {
      const mIdx = MONTH_NAMES.indexOf(String(article.month).toUpperCase());
      if (mIdx !== -1) monthIdx = mIdx;
    }

    const monthName = MONTH_NAMES[monthIdx];
    const shortYear = String(year).slice(-2);
    const sortVal = (year * 100) + monthIdx;

    return {
      year,
      shortYear,
      monthName,
      monthIdx,
      sortVal,
      groupKey: `${monthName} '${shortYear}`
    };
  }

  function measureTimelineCardPositions() {
    if (!cachedTimelineCards.length) return;
    cachedCardPositions = cachedTimelineCards.map(card => ({
      card,
      left: card.offsetLeft,
      group: card.dataset.group || '',
      month: card.dataset.month || 'MARCH',
      year: card.dataset.year || '2026'
    }));
  }

  function renderTimeline() {
    if (!timelineTrack) return;
    const rawArticles = siteData.articles || [];

    // Precalculate sortVal once to avoid O(N log N) redundant date calculations
    const articlesWithInfo = rawArticles.map(a => ({
      article: a,
      info: getArticleDateInfo(a)
    }));

    articlesWithInfo.sort((a, b) => {
      if (a.info.sortVal !== b.info.sortVal) {
        return b.info.sortVal - a.info.sortVal;
      }
      return (a.article.index || 0) - (b.article.index || 0);
    });

    let currentGroup = '';
    timelineTrack.innerHTML = articlesWithInfo.map((item, idx) => {
      const article = item.article;
      const info = item.info;
      const isNewGroup = info.groupKey !== currentGroup;
      if (isNewGroup) {
        currentGroup = info.groupKey;
      }
      const safeAspect = typeof article.aspect === 'number' ? article.aspect : 1.25;
      const safeIndex = parseInt(article.index, 10) || (idx + 1);
      return `
        <article class="timeline-card" tabindex="0" role="button" aria-label="${escapeHtml(article.title)}" data-slug="${escapeHtml(article.slug)}" data-month="${escapeHtml(info.monthName)}" data-year="${info.year}" data-group="${escapeHtml(info.groupKey)}" data-index="${idx}">
          ${isNewGroup ? `<div class="timeline-month-flag"><span>${escapeHtml(info.monthName)}</span> <span>'${info.shortYear}</span></div>` : ''}
          <span class="timeline-card__badge-top">${safeIndex}</span>
          <div class="timeline-card__media" style="aspect-ratio: ${safeAspect};">
            <img src="${escapeHtml(article.cover || './assets/images/cover-01.svg')}" alt="${escapeHtml(article.title)}" class="timeline-card__img" loading="lazy" />
          </div>
          <span class="timeline-card__badge-bottom">${escapeHtml(article.tag || 'INSPIRE')} (${escapeHtml(info.monthName)})</span>
        </article>
      `;
    }).join('');

    // Cache elements for 60fps animation without querySelectorAll on every frame
    cachedTimelineCards = Array.from(timelineTrack.querySelectorAll('.timeline-card'));
    cachedTimelineMedia = Array.from(timelineTrack.querySelectorAll('.timeline-card__media'));

    // Bind click & keyboard accessibility on cards
    cachedTimelineCards.forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        if (slug) openArticleDrawer(slug);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const slug = card.dataset.slug;
          if (slug) openArticleDrawer(slug);
        }
      });
    });

    currentActiveMonth = '';
    renderTimelineRuler();
    if (rulerMonths) rulerMonths.scrollLeft = 0;
    setupTimelineDrag();
    measureTimelineCardPositions();

    setTimeout(() => {
      measureTimelineCardPositions();
      checkActiveMonth();
    }, 50);
  }

  function renderTimelineRuler() {
    if (!rulerTicks || !rulerMonths) return;

    // Render 120 ticks
    let ticksHtml = '';
    for (let i = 0; i < 120; i++) {
      const isMajor = i % 5 === 0;
      ticksHtml += `<div class="ruler-tick ${isMajor ? 'ruler-tick--major' : ''}" data-tick="${i}"></div>`;
    }
    rulerTicks.innerHTML = ticksHtml;

    // Extract month groups in chronological order
    const rawArticles = siteData.articles || [];
    const groups = [];
    const seenGroups = new Set();

    // Sort to extract groups in chronological order
    rawArticles.slice().sort((a, b) => getArticleDateInfo(b).sortVal - getArticleDateInfo(a).sortVal).forEach(a => {
      const info = getArticleDateInfo(a);
      if (!seenGroups.has(info.groupKey)) {
        seenGroups.add(info.groupKey);
        groups.push(info);
      }
    });

    if (groups.length === 0) {
      groups.push({ groupKey: "MARCH '26", monthName: "MARCH", year: 2026, shortYear: "26" });
    }

    rulerMonths.innerHTML = groups.map((g, idx) => `
      <button type="button" class="ruler-month-btn ${idx === 0 ? 'is-active' : ''}" data-month="${escapeHtml(g.monthName)}" data-year="${g.year}" data-group="${escapeHtml(g.groupKey)}">
        ${escapeHtml(g.groupKey)}
      </button>
    `).join('');

    // Bind click events on month buttons to jump directly to that month group
    rulerMonths.querySelectorAll('.ruler-month-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetGroup = btn.dataset.group;
        scrollToMonthGroup(targetGroup);
      });
    });
  }

  function scrollToMonthGroup(groupKey) {
    if (!timelineTrack || !timelineViewport) return;
    const cards = Array.from(timelineTrack.querySelectorAll('.timeline-card'));
    const targetCard = cards.find(c => c.dataset.group === groupKey);
    if (targetCard) {
      timelineTargetX = Math.max(0, targetCard.offsetLeft - 80);
      clampTimelineTarget();
      startTimelineAnimation();
      playClick();
    }
  }

  function clampTimelineTarget() {
    if (!timelineTrack || !timelineViewport) return;
    timelineMaxX = Math.max(0, timelineTrack.scrollWidth - timelineViewport.clientWidth);
    timelineTargetX = Math.max(0, Math.min(timelineTargetX, timelineMaxX));
  }

  function startTimelineAnimation() {
    if (timelineAnimId) return;

    function step() {
      if (!timelineViewport || !timelineTrack) return;
      const diff = timelineTargetX - timelineCurrentX;
      const velocity = diff * 0.16;
      timelineCurrentX += velocity;

      timelineViewport.scrollLeft = timelineCurrentX;

      // 3D card tilt based on velocity using cached media elements
      const tilt = Math.max(-10, Math.min(10, -velocity * 0.08));
      const shouldTilt = Math.abs(tilt) > 0.2;
      for (let i = 0; i < cachedTimelineMedia.length; i++) {
        cachedTimelineMedia[i].style.transform = shouldTilt ? `rotateY(${tilt}deg)` : '';
      }

      // Shift ruler ticks continuously to create mechanical tick ruler illusion
      if (rulerTicks) {
        const tickShift = -(timelineCurrentX % 70);
        rulerTicks.style.transform = `translate3d(${tickShift}px, 0, 0)`;
      }

      // Check active month under center viewport (reads from memory, zero layout reflows)
      checkActiveMonth();

      if (Math.abs(diff) > 0.5) {
        timelineAnimId = requestAnimationFrame(step);
      } else {
        timelineCurrentX = timelineTargetX;
        timelineViewport.scrollLeft = timelineCurrentX;
        for (let i = 0; i < cachedTimelineMedia.length; i++) {
          cachedTimelineMedia[i].style.transform = '';
        }
        timelineAnimId = null;
      }
    }

    timelineAnimId = requestAnimationFrame(step);
  }

  function checkActiveMonth() {
    if (!timelineViewport || !timelineTrack || !cachedCardPositions.length) return;

    let activeData = null;

    // If near the end of timeline scroll, pick the last card
    if (timelineMaxX > 0 && timelineCurrentX >= timelineMaxX - 80) {
      activeData = cachedCardPositions[cachedCardPositions.length - 1];
    } else {
      const focalPoint = timelineCurrentX + 120;
      let minDistance = Infinity;

      for (let i = 0; i < cachedCardPositions.length; i++) {
        const item = cachedCardPositions[i];
        const dist = Math.abs(item.left - focalPoint);
        if (dist < minDistance) {
          minDistance = dist;
          activeData = item;
        }
      }
    }

    if (activeData) {
      const groupKey = activeData.group || '';
      if (groupKey !== currentActiveMonth) {
        currentActiveMonth = groupKey;
        onActiveMonthChanged(activeData);
      }
    }
  }

  function onActiveMonthChanged(activeData) {
    const month = (activeData.month || 'MARCH').toUpperCase();
    const shortYear = activeData.year ? String(activeData.year).slice(-2) : '26';
    const groupKey = activeData.group || `${month} '${shortYear}`;

    // 1. Update ruler buttons
    if (rulerMonths) {
      rulerMonths.querySelectorAll('.ruler-month-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.group === groupKey);
      });
      const activeBtn = rulerMonths.querySelector(`.ruler-month-btn[data-group="${groupKey}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }

    // 2. Update header branding row (EDV/MONTH 'YEAR)
    const brandRow3 = document.getElementById('brand-row-3');
    if (brandRow3) {
      brandRow3.innerHTML = `(EDV/${escapeHtml(month)} '${shortYear})`;
    }

    // 3. Play tick SFX
    playFx();
  }

  let timelineListenersBound = false;
  function setupTimelineDrag() {
    if (!timelineViewport || timelineListenersBound) return;
    timelineListenersBound = true;

    window.addEventListener('resize', measureTimelineCardPositions);

    // Mouse Drag with inertia fling
    let isDown = false;
    let startX = 0;
    let dragStartTarget = 0;
    let draggedDist = 0;
    let lastMoveTime = 0;
    let lastMoveX = 0;
    let dragVelocity = 0;

    timelineViewport.addEventListener('mousedown', (e) => {
      isDown = true;
      timelineViewport.classList.add('is-dragging');
      startX = e.pageX;
      lastMoveX = e.pageX;
      lastMoveTime = Date.now();
      dragStartTarget = timelineTargetX;
      draggedDist = 0;
      dragVelocity = 0;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const now = Date.now();
      const dt = now - lastMoveTime || 16;
      const dx = e.pageX - lastMoveX;
      dragVelocity = dx / dt;
      lastMoveX = e.pageX;
      lastMoveTime = now;

      const totalDx = e.pageX - startX;
      draggedDist += Math.abs(dx);
      timelineTargetX = dragStartTarget - (totalDx * 1.5);
      clampTimelineTarget();
      startTimelineAnimation();
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      timelineViewport.classList.remove('is-dragging');
      if (Math.abs(dragVelocity) > 0.15) {
        timelineTargetX -= dragVelocity * 200;
        clampTimelineTarget();
        startTimelineAnimation();
      }
    });

    // Wheel scrolling on timeline (single listener on viewport only to prevent double-scrolling)
    const handleWheel = (e) => {
      const section = document.getElementById('view-timeline');
      if (!section || !section.classList.contains('is-active')) return;
      if (activeArticleSlug) return;

      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      timelineTargetX += delta * 1.5;
      clampTimelineTarget();
      startTimelineAnimation();
    };

    timelineViewport.addEventListener('wheel', handleWheel, { passive: false });
    const rulerWrapper = document.getElementById('timeline-ruler-wrapper');
    if (rulerWrapper) {
      rulerWrapper.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Keyboard Arrow navigation
    window.addEventListener('keydown', (e) => {
      const section = document.getElementById('view-timeline');
      if (!section || !section.classList.contains('is-active')) return;
      if (activeArticleSlug) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        timelineTargetX += 340;
        clampTimelineTarget();
        startTimelineAnimation();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        timelineTargetX -= 340;
        clampTimelineTarget();
        startTimelineAnimation();
      }
    });

    // Click handler on card
    timelineViewport.addEventListener('click', (e) => {
      const card = e.target.closest('.timeline-card');
      if (card && draggedDist < 10) {
        const slug = card.dataset.slug;
        openArticleDrawer(slug);
      }
    });

    // Touch support (Mobile swipe with inertia)
    let touchStartX = 0;
    let touchStartTarget = 0;
    let touchLastX = 0;
    let touchLastTime = 0;
    let touchVelocity = 0;

    timelineViewport.addEventListener('touchstart', (e) => {
      if (!e.touches.length) return;
      touchStartX = e.touches[0].pageX;
      touchLastX = touchStartX;
      touchLastTime = Date.now();
      touchStartTarget = timelineTargetX;
      draggedDist = 0;
      touchVelocity = 0;
    }, { passive: true });

    timelineViewport.addEventListener('touchmove', (e) => {
      if (!e.touches.length) return;
      const currentX = e.touches[0].pageX;
      const now = Date.now();
      const dt = now - touchLastTime || 16;
      const dx = currentX - touchLastX;
      touchVelocity = dx / dt;
      touchLastX = currentX;
      touchLastTime = now;

      const totalDx = currentX - touchStartX;
      draggedDist += Math.abs(dx);
      timelineTargetX = touchStartTarget - (totalDx * 1.3);
      clampTimelineTarget();
      startTimelineAnimation();
    }, { passive: true });

    timelineViewport.addEventListener('touchend', (e) => {
      if (Math.abs(touchVelocity) > 0.15) {
        timelineTargetX -= touchVelocity * 200;
        clampTimelineTarget();
        startTimelineAnimation();
      }
      if (draggedDist < 10) {
        const card = e.target.closest('.timeline-card');
        if (card && card.dataset.slug) {
          openArticleDrawer(card.dataset.slug);
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Surf 3D View Controller (Exact Sine-Wave Ribbon from Real Site)
     -------------------------------------------------------------------------- */
  let surfCurrentScroll = 0;
  let surfTargetScroll = 0;
  let surfVelocity = 0;
  let surfWaveTime = 0;
  let surfAnimId = null;
  let surfItems = [];
  let surfTotalWidth = 0;
  let surfStepX = 80;
  let surfStepY = 40;
  let surfRestAmplitude = 14;
  let surfHoveredIndex = -1;
  const surfFloatingInfo = document.getElementById('surf-floating-info');
  let surfListenersBound = false;

  function renderSurf() {
    if (!surfRibbon) return;
    const articles = (siteData.articles || []).slice(0, 48);
    if (!articles.length) return;

    surfRibbon.innerHTML = articles.map((article, idx) => `
      <article class="surf-carousel-item js-slide" data-slug="${escapeHtml(article.slug)}" data-index="${idx}">
        <div class="surf-carousel-item__content js-slide-content">
          <div class="surf-carousel-item__media">
            <img src="${escapeHtml(article.cover || './assets/images/cover-01.svg')}" alt="${escapeHtml(article.title)}" loading="lazy" />
          </div>
        </div>
      </article>
    `).join('');

    measureSurf();
    setupSurfEvents();
    if (currentView === 'surf') {
      startSurfAnimation();
    }
  }

  function measureSurf() {
    if (!surfRibbon) return;
    const itemEls = Array.from(surfRibbon.querySelectorAll('.surf-carousel-item'));
    if (!itemEls.length) return;

    const ww = window.innerWidth;
    const wh = window.innerHeight;
    const isSmall = ww < 768;
    const P = isSmall ? 6 : 18;
    surfStepX = ww / P;
    surfStepY = wh / (P * 1.5);
    surfRestAmplitude = surfStepY * 0.35;

    const cardWidth = itemEls[0]?.offsetWidth || (isSmall ? 224 : 304);

    surfItems = itemEls.map((el, idx) => {
      const left = surfStepX * idx;
      const width = cardWidth;
      const end = left + width;
      const start = left - width - ww;
      const article = (siteData.articles || [])[idx] || {};

      el.onmouseenter = () => {
        surfHoveredIndex = idx;
        updateSurfInfo(article, idx);
      };
      el.onmouseleave = () => {
        if (surfHoveredIndex === idx) {
          surfHoveredIndex = -1;
          updateSurfInfo(null, -1);
        }
      };

      return {
        el,
        index: idx,
        slug: el.dataset.slug,
        article,
        left,
        width,
        start,
        end
      };
    });

    surfTotalWidth = Math.max(0, (surfStepX * (surfItems.length - 1)) + cardWidth);
  }

  function updateSurfInfo(article, idx) {
    if (!surfFloatingInfo) return;
    if (idx >= 0 && article) {
      const tag = article.tag || 'EDITORIAL';
      const month = article.month || 'MARCH';
      surfFloatingInfo.textContent = `(${idx + 1}) ${tag} / ${month}`;
    } else {
      surfFloatingInfo.textContent = '';
    }
  }

  function wrap(min, max, value) {
    const range = max - min;
    if (range <= 0) return min;
    return ((((value - min) % range) + range) % range) + min;
  }

  function updateSurfFrame() {
    if (!surfItems.length) return;
    const ww = window.innerWidth;
    const wh = window.innerHeight;

    // Smooth lerp:
    const diff = surfTargetScroll - surfCurrentScroll;
    surfVelocity = diff * 0.12;
    surfCurrentScroll += surfVelocity;
    surfWaveTime += 0.022;

    const absVel = Math.abs(surfVelocity);

    surfItems.forEach(item => {
      const minWrap = -(surfTotalWidth - item.end);
      const maxWrap = item.end;
      const n = wrap(minWrap, maxWrap, surfCurrentScroll);

      const inside = n > item.start && n < item.end;
      if (!inside) {
        item.el.style.visibility = 'hidden';
        return;
      }
      item.el.style.visibility = 'visible';

      const o = Math.max(0, Math.min(1, 1 + (n - item.left - item.width) / (ww + item.width)));
      const p = 1 - (1 - o);
      const x = p - 0.5;
      const wave = Math.sin(surfWaveTime + x * Math.PI * 2) * surfRestAmplitude * (1 + absVel * 0.015);
      const translateY = (wh * 0.45 * x) + wave;
      const translateX = item.left - n;
      const rotateY = -(15 * p) - 70;

      const zIndex = surfHoveredIndex === item.index ? 1000 : Math.round(p * 100) + 10;
      item.el.style.zIndex = zIndex;

      item.el.style.transform = `translate3d(${translateX.toFixed(1)}px, ${translateY.toFixed(1)}px, 0px) rotateY(${rotateY.toFixed(1)}deg)`;
    });
  }

  function surfAnimationLoop() {
    if (currentView !== 'surf') {
      surfAnimId = null;
      return;
    }
    updateSurfFrame();
    surfAnimId = requestAnimationFrame(surfAnimationLoop);
  }

  function startSurfAnimation() {
    if (surfAnimId) return;
    measureSurf();
    surfAnimId = requestAnimationFrame(surfAnimationLoop);
  }

  function stopSurfAnimation() {
    if (surfAnimId) {
      cancelAnimationFrame(surfAnimId);
      surfAnimId = null;
    }
  }

  function setupSurfEvents() {
    if (!surfContainer || surfListenersBound) return;
    surfListenersBound = true;

    const isSmall = () => window.innerWidth < 768;
    const dragMultiplier = () => (isSmall() ? 3.5 : 2.0);

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let dragStartScroll = 0;
    let draggedDist = 0;
    let lastX = 0;
    let lastTime = 0;
    let dragVelocity = 0;

    // Mouse drag
    surfContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      surfContainer.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      lastTime = Date.now();
      dragStartScroll = surfTargetScroll;
      draggedDist = 0;
      dragVelocity = 0;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const now = Date.now();
      const dt = now - lastTime || 16;
      const dx = e.clientX - lastX;
      dragVelocity = dx / dt;
      lastX = e.clientX;
      lastTime = now;

      const totalDx = e.clientX - startX;
      draggedDist += Math.abs(dx);
      surfTargetScroll = dragStartScroll - (totalDx * dragMultiplier());
      if (!surfAnimId) startSurfAnimation();
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      surfContainer.classList.remove('is-dragging');
      if (Math.abs(dragVelocity) > 0.15) {
        surfTargetScroll -= dragVelocity * 220;
      }
    });

    // Touch events
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScroll = 0;
    let touchVelocity = 0;
    let lastTouchX = 0;
    let lastTouchTime = 0;
    let isTouchDragging = false;

    surfContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      lastTouchX = touchStartX;
      lastTouchTime = Date.now();
      touchStartScroll = surfTargetScroll;
      touchVelocity = 0;
      draggedDist = 0;
      isTouchDragging = true;
    }, { passive: true });

    surfContainer.addEventListener('touchmove', (e) => {
      if (!isTouchDragging || e.touches.length !== 1) return;
      const now = Date.now();
      const dt = now - lastTouchTime || 16;
      const cx = e.touches[0].clientX;
      const cy = e.touches[0].clientY;
      const dx = cx - lastTouchX;
      touchVelocity = dx / dt;
      lastTouchX = cx;
      lastTouchTime = now;

      const totalDx = cx - touchStartX;
      const totalDy = cy - touchStartY;

      if (Math.abs(totalDx) > Math.abs(totalDy) && e.cancelable) {
        e.preventDefault();
      }

      draggedDist += Math.abs(dx);
      surfTargetScroll = touchStartScroll - (totalDx * dragMultiplier());
      if (!surfAnimId) startSurfAnimation();
    }, { passive: false });

    surfContainer.addEventListener('touchend', () => {
      if (!isTouchDragging) return;
      isTouchDragging = false;
      if (Math.abs(touchVelocity) > 0.15) {
        surfTargetScroll -= touchVelocity * 220;
      }
    });

    // Wheel scrolling
    surfContainer.addEventListener('wheel', (e) => {
      if (currentView !== 'surf') return;
      if (activeArticleSlug) return;

      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      surfTargetScroll += delta * 1.5;
      if (!surfAnimId) startSurfAnimation();
    }, { passive: false });

    // Keyboard ArrowLeft / ArrowRight
    window.addEventListener('keydown', (e) => {
      if (currentView !== 'surf' || activeArticleSlug) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        surfTargetScroll += surfStepX * 4;
        if (!surfAnimId) startSurfAnimation();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        surfTargetScroll -= surfStepX * 4;
        if (!surfAnimId) startSurfAnimation();
      }
    });

    // Card click
    surfContainer.addEventListener('click', (e) => {
      if (draggedDist > 10) return;
      const card = e.target.closest('.surf-carousel-item');
      if (card && card.dataset.slug) {
        openArticleDrawer(card.dataset.slug);
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      if (currentView === 'surf') {
        measureSurf();
        updateSurfFrame();
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. Index View Controller (Grouped by Month with Quick Jump)
     -------------------------------------------------------------------------- */
  function renderIndex() {
    if (!indexGrid) return;
    const rawArticles = siteData.articles || [];

    const groups = {};
    const groupOrder = [];

    // Precompute sortVal once
    const articlesWithInfo = rawArticles.map(a => ({
      article: a,
      info: getArticleDateInfo(a)
    }));

    articlesWithInfo.sort((a, b) => b.info.sortVal - a.info.sortVal);

    articlesWithInfo.forEach(item => {
      const a = item.article;
      const info = item.info;
      if (!groups[info.groupKey]) {
        groups[info.groupKey] = { info, list: [] };
        groupOrder.push(info.groupKey);
      }
      groups[info.groupKey].list.push(a);
    });

    let html = `
      <div class="index-month-nav" id="index-month-nav">
        ${groupOrder.map(k => `
          <button type="button" class="index-month-nav-btn" data-target="index-group-${escapeHtml(k.replace(/\s+/g, '-').replace(/'/g, ''))}">
            ${escapeHtml(k)} (${groups[k].list.length})
          </button>
        `).join('')}
      </div>
    `;

    groupOrder.forEach(k => {
      const { info, list } = groups[k];
      const sectionId = `index-group-${escapeHtml(k.replace(/\s+/g, '-').replace(/'/g, ''))}`;
      html += `
        <div class="index-month-section" id="${sectionId}">
          <div class="index-month-header">
            <span>${escapeHtml(info.monthName)} '${info.shortYear}</span>
            <span>(${list.length} ITEMS)</span>
          </div>
          <div class="index-cards-row">
            ${list.map(a => `
              <div class="index-card" data-slug="${escapeHtml(a.slug)}" tabindex="0" role="button" aria-label="${escapeHtml(a.title)}">
                <img src="${escapeHtml(a.cover || './assets/images/cover-01.svg')}" alt="${escapeHtml(a.title)}" class="index-card__thumb" loading="lazy" />
                <h4 class="index-card__title">${escapeHtml(a.title)}</h4>
                <span class="index-card__meta">${escapeHtml(a.tag || 'INSPIRE')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    });

    indexGrid.innerHTML = html;

    // Month nav click jump
    indexGrid.querySelectorAll('.index-month-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetElem = document.getElementById(targetId);
        if (targetElem) {
          targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
          playClick();
        }
      });
    });

    indexGrid.querySelectorAll('.index-card').forEach(card => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        openArticleDrawer(slug);
      });
    });
  }

  /* --------------------------------------------------------------------------
     8. About View Controller (Infinite Looping Virtual Scroll & 3D Trajectory)
     -------------------------------------------------------------------------- */
  let aboutTargetY = 0;
  let aboutCurrentY = 0;
  let aboutAnimId = null;
  let aboutBlocks = [];
  let aboutTotalHeight = 0;
  let aboutListenersBound = false;
  const soundDesign = new Audio('./assets/audio/fx.wav');
  const soundDev = new Audio('./assets/audio/fx.wav');

  function renderAbout() {
    const about = siteData.about || {};
    const badgeLeft = document.getElementById('about-badge-left');
    const badgeRight = document.getElementById('about-badge-right');
    const title = document.getElementById('about-title');
    const manifesto1 = document.getElementById('about-manifesto-1');
    const manifesto2 = document.getElementById('about-manifesto-2');
    const pillarsContainer = document.getElementById('about-pillars');
    const copyright = document.getElementById('about-copyright');

    if (badgeLeft) badgeLeft.textContent = about.badgeLeft || '(YB)';
    if (badgeRight) badgeRight.textContent = about.badgeRight || '(24-26)';
    if (title) {
      const heroTitle = about.title || '"The Yearbook"';
      const heroYear = about.yearLabel || '(YB/2026)';
      title.innerHTML = `${escapeHtml(heroTitle).replace(/\n/g, '<br />')}<br />${escapeHtml(heroYear)}<br />Your living<br />archive of<br />edvlabs`;
    }
    if (manifesto1) manifesto1.textContent = about.manifesto1 || '';
    if (manifesto2) manifesto2.textContent = about.manifesto2 || '';
    if (copyright) copyright.textContent = about.copyright || '©edvlabs/2026';

    // Spinning Globe Video Source
    const globeVideo = document.getElementById('about-globe-video');
    if (globeVideo && about.videoSrc) {
      const safeSrc = sanitizeUrl(about.videoSrc);
      const currentSrc = globeVideo.querySelector('source')?.getAttribute('src');
      if (safeSrc && currentSrc !== safeSrc) {
        globeVideo.innerHTML = `<source src="${escapeHtml(safeSrc)}" type="video/mp4" />`;
        globeVideo.load();
      }
    }

    // Word of Thanks & Tagline
    const thanksLeft = document.querySelector('.thanks-col-left');
    if (thanksLeft && about.thanksHeading) {
      thanksLeft.innerHTML = escapeHtml(about.thanksHeading).replace(/\n/g, '<br />');
    }
    const thanksRight = document.querySelector('.thanks-col-right');
    if (thanksRight && about.tagline) {
      thanksRight.innerHTML = escapeHtml(about.tagline).replace(/\n/g, '<br />');
    }

    // Kinetic header branding from settings
    const brandRow1 = document.getElementById('brand-row-1');
    const brandRow2 = document.getElementById('brand-row-2');
    if (brandRow1 && siteData.meta && siteData.meta.headerTitle) {
      brandRow1.textContent = siteData.meta.headerTitle;
    }
    if (brandRow2 && siteData.meta && siteData.meta.headerSubtitle) {
      brandRow2.textContent = siteData.meta.headerSubtitle;
    }

    // CRT Noise Overlay toggle
    const isNoiseOn = siteData.meta ? siteData.meta.noiseOverlay !== false : true;
    document.body.classList.toggle('has-grain', isNoiseOn);
    const noiseOverlay = document.querySelector('.noise-overlay');
    if (noiseOverlay) {
      noiseOverlay.style.display = isNoiseOn ? 'block' : 'none';
    }

    // Sound enabled by default setting
    if (siteData.meta && siteData.meta.soundEnabledByDefault && !isSoundEnabled) {
      isSoundEnabled = true;
    }

    // Dynamic Pillars (deduplicated - fallback from window.YB_DEFAULT_DATA)
    const defPillars = (window.YB_DEFAULT_DATA && window.YB_DEFAULT_DATA.about) ? window.YB_DEFAULT_DATA.about.pillars : [];
    const pillars = (about.pillars && about.pillars.length) ? about.pillars : defPillars;

    if (pillarsContainer) {
      pillarsContainer.innerHTML = pillars.map(p => `
        <li class="about-pillar-item">
          <div class="about-pillar-num">${escapeHtml(p.num)}</div>
          <div class="about-pillar-body">
            <h3 class="about-pillar-title">${escapeHtml(p.title)}</h3>
            <p class="about-pillar-desc">${escapeHtml(p.text)}</p>
          </div>
        </li>
      `).join('');
    }

    setupAboutPopovers();
    measureAboutBlocks();
    setupAboutScroll();
    if (currentView === 'about') {
      startAboutAnimation();
    }
  }

  function measureAboutBlocks() {
    const scroller = document.getElementById('about-scroller');
    const content = document.getElementById('about-content');
    if (!scroller || !content) return;

    const blockEls = Array.from(content.querySelectorAll('[data-smooth]'));
    if (!blockEls.length) return;

    // Reset transforms to measure clean base positions
    blockEls.forEach(b => {
      b.style.transform = 'translate3d(0px, 0px, 0px)';
    });

    const contentRect = content.getBoundingClientRect();
    const wh = window.innerHeight;

    aboutBlocks = blockEls.map((el, idx) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - contentRect.top;
      const height = rect.height;
      const bottom = top + height;
      const start = top - wh;
      const end = bottom;
      return { el, index: idx, top, height, bottom, start, end };
    });

    const lastBlock = aboutBlocks[aboutBlocks.length - 1];
    const lastMargin = parseInt(window.getComputedStyle(lastBlock.el).marginBottom) || 0;
    aboutTotalHeight = Math.max(wh * 1.5, lastBlock.bottom + lastMargin);
  }

  function updateAboutFrame() {
    if (!aboutBlocks.length || !aboutTotalHeight) return;

    const diff = aboutTargetY - aboutCurrentY;
    aboutCurrentY += diff * 0.12;

    const wh = window.innerHeight;
    const buffer = wh * 0.05;

    aboutBlocks.forEach(item => {
      // Exact infinite wrap from Nuxt wyNRnxoT.js:
      // o = wrap(-(totalHeight - item.end), item.end, scroll)
      const minWrap = -(aboutTotalHeight - item.end);
      const maxWrap = item.end;
      const o = wrap(minWrap, maxWrap, aboutCurrentY);

      // Check visibility bounds
      const visible = (o > item.start - buffer) && (o < item.end + buffer);
      if (!visible) {
        item.el.style.visibility = 'hidden';
      } else {
        item.el.style.visibility = 'visible';
        item.el.style.transform = `translate3d(0px, ${(-o).toFixed(1)}px, 0px)`;
      }
    });

    // Animate 3D Globe Sculpture along trajectory
    const globeMedia = document.getElementById('about-globe-media');
    if (globeMedia) {
      const ww = window.innerWidth;
      if (ww >= 900) {
        // Continuous normalized cycle [0, 1)
        const cycleScroll = wrap(0, aboutTotalHeight, aboutCurrentY);
        const progress = cycleScroll / aboutTotalHeight;

        let x = 0;
        let y = 0;
        let scale = 1.0;

        if (progress <= 0.15) {
          x = 0;
          y = 0;
          scale = 1.0;
        } else if (progress <= 0.45) {
          const t = (progress - 0.15) / 0.30;
          const ease = Math.sin(t * Math.PI / 2);
          x = - (ww * 0.28 * ease);
          y = (wh * 0.22 * ease);
          scale = 1.0 - (0.45 * ease);
        } else if (progress <= 0.75) {
          const t = (progress - 0.45) / 0.30;
          const ease = Math.sin(t * Math.PI / 2);
          const startX = - (ww * 0.28);
          const targetX = (ww * 0.08);
          x = startX + (targetX - startX) * ease;
          y = (wh * 0.22) + (wh * 0.04 * ease);
          scale = 0.55 - (0.05 * ease);
        } else {
          const t = (progress - 0.75) / 0.25;
          const ease = Math.sin(t * Math.PI / 2);
          const startX = (ww * 0.08);
          x = startX * (1 - ease);
          y = (wh * 0.26) * (1 - ease);
          scale = 0.50 + (0.35 * ease);
        }

        globeMedia.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0px) scale(${scale.toFixed(3)})`;
      } else {
        globeMedia.style.transform = '';
      }
    }
  }

  function aboutAnimationLoop() {
    if (currentView !== 'about') {
      aboutAnimId = null;
      return;
    }
    updateAboutFrame();
    const diff = Math.abs(aboutTargetY - aboutCurrentY);
    if (diff > 0.15) {
      aboutAnimId = requestAnimationFrame(aboutAnimationLoop);
    } else {
      aboutCurrentY = aboutTargetY;
      updateAboutFrame();
      aboutAnimId = null;
    }
  }

  function startAboutAnimation() {
    if (aboutAnimId) return;
    measureAboutBlocks();
    aboutAnimId = requestAnimationFrame(aboutAnimationLoop);
  }

  function stopAboutAnimation() {
    if (aboutAnimId) {
      cancelAnimationFrame(aboutAnimId);
      aboutAnimId = null;
    }
  }

  function setupAboutPopovers() {
    // Credits popover
    const btnCredits = document.getElementById('btn-site-credits');
    const popoverCredits = document.getElementById('credits-popover');
    const creditGil = document.getElementById('credit-design');
    const creditDev = document.getElementById('credit-dev');

    if (btnCredits && popoverCredits) {
      btnCredits.onclick = (e) => {
        e.stopPropagation();
        popoverCredits.classList.toggle('is-hidden');
      };

      if (creditGil) {
        creditGil.onmouseenter = () => {
          if (isSoundEnabled) {
            soundDesign.currentTime = 0;
            soundDesign.play().catch(() => {});
          }
        };
      }

      if (creditDev) {
        creditDev.onmouseenter = () => {
          if (isSoundEnabled) {
            soundDev.currentTime = 0;
            soundDev.play().catch(() => {});
          }
        };
      }
    }

    // Contact popover & copy email
    const btnContact = document.getElementById('btn-contact-us');
    const popoverContact = document.getElementById('contact-popover');
    const btnCopyEmail = document.getElementById('btn-copy-email');

    if (btnContact && popoverContact) {
      btnContact.onclick = (e) => {
        e.stopPropagation();
        popoverContact.classList.toggle('is-hidden');
      };
    }

    if (btnCopyEmail) {
      btnCopyEmail.onclick = async (e) => {
        e.stopPropagation();
        const email = siteData.about?.contactEmail || 'info@edvlabs.example';
        try {
          await navigator.clipboard.writeText(email);
          btnCopyEmail.textContent = 'Copied!';
          setTimeout(() => {
            btnCopyEmail.textContent = 'Copy email';
            if (popoverContact) popoverContact.classList.add('is-hidden');
          }, 2000);
        } catch {
          btnCopyEmail.textContent = email;
        }
      };
    }

    // Close popovers on click outside
    window.addEventListener('click', () => {
      if (popoverCredits) popoverCredits.classList.add('is-hidden');
      if (popoverContact) popoverContact.classList.add('is-hidden');
    });
  }

  function setupAboutScroll() {
    if (aboutListenersBound) return;
    aboutListenersBound = true;

    const scroller = document.getElementById('about-scroller');
    if (!scroller) return;

    // Wheel scrolling (infinite loop - never clamped)
    window.addEventListener('wheel', (e) => {
      if (currentView !== 'about') return;
      if (activeArticleSlug) return;
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      aboutTargetY += delta * 1.5;
      if (!aboutAnimId) startAboutAnimation();
    }, { passive: false });

    // Touch events (mobile - infinite loop)
    let touchStartY = 0;
    let touchStartTarget = 0;
    let touchVelocity = 0;
    let lastTouchY = 0;
    let lastTouchTime = 0;
    let isTouchDragging = false;

    scroller.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
      lastTouchY = touchStartY;
      lastTouchTime = Date.now();
      touchStartTarget = aboutTargetY;
      touchVelocity = 0;
      isTouchDragging = true;
    }, { passive: true });

    scroller.addEventListener('touchmove', (e) => {
      if (!isTouchDragging || e.touches.length !== 1) return;
      const now = Date.now();
      const dt = now - lastTouchTime || 16;
      const cy = e.touches[0].clientY;
      const dy = cy - lastTouchY;
      touchVelocity = dy / dt;
      lastTouchY = cy;
      lastTouchTime = now;

      const totalDy = cy - touchStartY;
      aboutTargetY = touchStartTarget - (totalDy * 1.8);
      if (!aboutAnimId) startAboutAnimation();
    }, { passive: true });

    scroller.addEventListener('touchend', () => {
      if (!isTouchDragging) return;
      isTouchDragging = false;
      if (Math.abs(touchVelocity) > 0.15) {
        aboutTargetY -= touchVelocity * 220;
        if (!aboutAnimId) startAboutAnimation();
      }
    });

    // Mouse drag with momentum
    let isMouseDown = false;
    let mouseStartY = 0;
    let mouseStartTarget = 0;
    let mouseLastY = 0;
    let mouseLastTime = 0;
    let mouseVelocity = 0;

    scroller.addEventListener('mousedown', (e) => {
      if (e.target.closest('button, a, input')) return;
      isMouseDown = true;
      scroller.classList.add('is-dragging');
      mouseStartY = e.clientY;
      mouseLastY = e.clientY;
      mouseLastTime = Date.now();
      mouseStartTarget = aboutTargetY;
      mouseVelocity = 0;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      const now = Date.now();
      const dt = now - mouseLastTime || 16;
      const dy = e.clientY - mouseLastY;
      mouseVelocity = dy / dt;
      mouseLastY = e.clientY;
      mouseLastTime = now;

      const totalDy = e.clientY - mouseStartY;
      aboutTargetY = mouseStartTarget - (totalDy * 1.8);
      if (!aboutAnimId) startAboutAnimation();
    });

    window.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      scroller.classList.remove('is-dragging');
      if (Math.abs(mouseVelocity) > 0.15) {
        aboutTargetY -= mouseVelocity * 220;
        if (!aboutAnimId) startAboutAnimation();
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (currentView !== 'about' || activeArticleSlug) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        aboutTargetY += 250;
        if (!aboutAnimId) startAboutAnimation();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        aboutTargetY -= 250;
        if (!aboutAnimId) startAboutAnimation();
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      if (currentView === 'about') {
        measureAboutBlocks();
        updateAboutFrame();
      }
    });
  }

  /* --------------------------------------------------------------------------
     9. Article Detail Drawer Controller
     -------------------------------------------------------------------------- */
  function openArticleDrawer(slug) {
    if (!slug) return;
    const article = (siteData.articles || []).find(a => a.slug === slug);
    if (!article) return;

    activeArticleSlug = slug;
    window.location.hash = `articles/${slug}`;

    if (drawerTitle) drawerTitle.textContent = article.title;
    if (drawerBadgeTag) drawerBadgeTag.textContent = article.tag || 'INSPIRE';
    if (drawerBadgeMonth) drawerBadgeMonth.textContent = `( ${article.month || 'MARCH'} )`;

    if (drawerSourceLink) {
      const safeUrl = sanitizeUrl(article.url);
      if (safeUrl) {
        drawerSourceLink.href = safeUrl;
        drawerSourceLink.style.display = 'inline-flex';
      } else {
        drawerSourceLink.style.display = 'none';
        drawerSourceLink.removeAttribute('href');
      }
    }

    if (drawerMedia) {
      drawerMedia.innerHTML = `
        <img src="${escapeHtml(article.cover || './assets/images/cover-01.svg')}" alt="${escapeHtml(article.title)}" />
      `;
    }

    if (drawerBody) {
      let contentHtml = article.content || `<p>${escapeHtml(article.excerpt || '')}</p>`;
      // Check for video embed (YouTube) with strict ID validation
      if (article.url && article.url.includes('youtube.com/watch?v=')) {
        const vidId = article.url.split('v=')[1]?.split('&')[0];
        if (vidId && /^[a-zA-Z0-9_-]{6,15}$/.test(vidId)) {
          contentHtml += `
            <div class="article-drawer__embed">
              <iframe src="https://www.youtube.com/embed/${vidId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          `;
        }
      }
      drawerBody.innerHTML = sanitizeHtml(contentHtml);
    }

    if (articleDrawer) {
      articleDrawer.classList.add('is-open');
      articleDrawer.setAttribute('aria-hidden', 'false');
    }
  }

  function closeArticleDrawer() {
    activeArticleSlug = null;
    if (articleDrawer) {
      articleDrawer.classList.remove('is-open');
      articleDrawer.setAttribute('aria-hidden', 'true');
    }
    if (window.location.hash.startsWith('#articles/')) {
      window.location.hash = `#${currentView}`;
    }
  }

  if (drawerBtnClose) drawerBtnClose.addEventListener('click', closeArticleDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeArticleDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && articleDrawer?.classList.contains('is-open')) {
      closeArticleDrawer();
    }
  });

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

  function sanitizeHtml(dirty) {
    if (window.YBStore && typeof window.YBStore.sanitizeHtml === 'function') {
      return window.YBStore.sanitizeHtml(dirty);
    }
    return dirty || '';
  }

  function sanitizeUrl(url, allowDataImage) {
    if (window.YBStore && typeof window.YBStore.sanitizeUrl === 'function') {
      return window.YBStore.sanitizeUrl(url, allowDataImage);
    }
    return url || '';
  }

  /* --------------------------------------------------------------------------
     11. Real-Time Store Subscription & Initialization
     -------------------------------------------------------------------------- */
  function fullRender() {
    renderTimeline();
    renderSurf();
    renderIndex();
    renderAbout();
    initAudioPlayer();
  }

  // Subscribe to live changes from Admin CMS
  if (window.YBStore) {
    window.YBStore.subscribe((newData) => {
      console.log('[App] Received live data update from CMS Studio');
      siteData = newData;
      fullRender();
      if (activeArticleSlug) {
        openArticleDrawer(activeArticleSlug);
      }
    });
  }

  // Mobile nav buttons bind
  if (mobileNav) {
    mobileNav.querySelectorAll('.mobile-nav__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        window.location.hash = `#${view}`;
      });
    });
  }

  // Hash route bind
  window.addEventListener('hashchange', handleHashChange);

  // Initialize
  initSoundGate();
  fullRender();
  handleHashChange();

})();
