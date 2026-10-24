/**
 * ViV MGMT — Main Frontend Application & Dynamic CMS Renderer (`app.js`)
 *
 * Implements:
 * 1. Dynamic Content Rendering & Live CMS Sync (`window.VIVStore`)
 * 2. Hero "ViV" SVG Split-Clip Reveal & Initial Zoom Entrance
 * 3. 5-Column Staggered Artist Gallery (Desktop Mouse-X Pan, Wheel Vertical Parallax, Mobile 2-Column Layout)
 * 4. Idle Top-Card Media Cycling Timeline with Dominant Color Crossfades
 * 5. Scroll-Scrubbed SplitText Strapline Character Animation
 * 6. Responsive 3-Column Masonry News Grid (Packery-style) with IntersectionObserver Fade-In
 * 7. Full-Screen Parallax Footer, Cursor-Tracking Hover Reveals & Dynamic Background Color Shifts
 * 8. Mobile Burger Menu, Smooth Scroller & Artist Portfolio Quick-View Lightbox
 */

(function () {
  'use strict';

  let galleryCleanups = [];
  let straplineCleanups = [];
  let newsCleanups = [];
  let footerCleanups = [];
  let lenisInstance = null;
  let currentSiteData = null;
  let currentRenderGen = 0;

  const escapeHtml = (str) => window.VIVStore.escapeHtml(str);
  const formatEmphasisHtml = (str) => window.VIVStore.formatEmphasisHtml(str);
  const sanitizeUrl = (url, fallback, allowData) => window.VIVStore.sanitizeUrl(url, fallback, allowData);
  const sanitizeCssUrl = (url) => window.VIVStore.sanitizeCssUrl(url);
  const sanitizeHexColor = (c, fb) => window.VIVStore.sanitizeHexColor(c, fb);

  document.addEventListener('DOMContentLoaded', () => {
    if (window.self !== window.top || new URLSearchParams(window.location.search).has('preview')) {
      document.body.classList.add('is-preview-iframe');
    }

    // Discreet Admin Button: Revealed via ?admin=1, #admin, stored flag, or Ctrl+Shift+A
    const adminBtn = document.getElementById('floating-admin-btn');
    const syncAdminBtnVisibility = () => {
      const params = new URLSearchParams(window.location.search);
      const isVisible =
        params.has('admin') ||
        window.location.hash === '#admin' ||
        localStorage.getItem('viv_admin_mode') === 'true';
      if (adminBtn) {
        adminBtn.classList.toggle('is-visible', isVisible);
      }
    };
    syncAdminBtnVisibility();

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const current = localStorage.getItem('viv_admin_mode') === 'true';
        localStorage.setItem('viv_admin_mode', String(!current));
        syncAdminBtnVisibility();
      }
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    initMobileMenu();
    initSmoothScroll();
    initLightbox();

    currentSiteData = window.VIVStore ? window.VIVStore.load() : window.VIV_DEFAULT_DATA;
    renderAll(currentSiteData, true);

    if (window.VIVStore && typeof window.VIVStore.onUpdate === 'function') {
      window.VIVStore.onUpdate((updatedData) => {
        if (!updatedData) return;
        currentSiteData = updatedData;
        sessionStorage.setItem('viv-home-loader', '1');
        renderAll(updatedData, false);
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      });
    }
  });

  /* ==========================================================================
     1. Master Render Pipeline
     ========================================================================== */
  function renderAll(data, isInitialLoad) {
    if (!data) return;

    renderNavbar(data.navbar);
    renderHeroText(data.hero);
    renderGallerySection(data.galleryColumns, data.hero, isInitialLoad);
    renderStraplineSection(data.straplineSection);
    renderNewsSection(data.newsSection);
    renderFooterSection(data.footerSection);
  }

  /* ==========================================================================
     2. Navbar & Mobile Burger Menu
     ========================================================================== */
  function renderNavbar(navbar) {
    if (!navbar) return;

    const leftLink = document.getElementById('js-navbar-artist-toggle');
    const leftLabel = document.getElementById('nav-left-label');
    if (leftLabel) leftLabel.textContent = navbar.leftLabel || 'Artists';
    if (leftLink) leftLink.setAttribute('href', sanitizeUrl(navbar.leftHref, '#artists'));

    const rightLink = document.getElementById('js-navbar-production-link');
    const rightLabel = document.getElementById('nav-right-label');
    if (rightLabel) rightLabel.textContent = navbar.rightLabel || 'Production';
    if (rightLink) rightLink.setAttribute('href', sanitizeUrl(navbar.rightHref, '#production'));

    const centerList = document.getElementById('nav-center-list');
    if (centerList && Array.isArray(navbar.centerLinks)) {
      centerList.innerHTML = navbar.centerLinks
        .map(
          (item) => `
          <li class="c-navbar__links-item">
            <a href="${escapeHtml(sanitizeUrl(item.href, '#'))}" class="c-navbar__links-link">
              <span>${escapeHtml(item.label)}</span>
            </a>
          </li>`
        )
        .join('');
    }

    const mobileList = document.getElementById('nav-mobile-list');
    if (mobileList && Array.isArray(navbar.mobileLinks)) {
      mobileList.innerHTML = navbar.mobileLinks
        .map(
          (item) => `
          <li>
            <a href="${escapeHtml(sanitizeUrl(item.href, '#'))}">${escapeHtml(item.label)}</a>
          </li>`
        )
        .join('');
    }
  }

  function initMobileMenu() {
    const burger = document.getElementById('js-burger');
    const mobileMenu = document.getElementById('js-mobile-menu');
    const navbar = document.getElementById('js-navbar');

    function closeMenu() {
      document.body.classList.remove('is-menu-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      if (mobileMenu) mobileMenu.setAttribute('aria-hidden', 'true');
    }

    if (burger && mobileMenu && navbar) {
      burger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (document.body.classList.contains('is-menu-open')) {
          closeMenu();
        } else {
          document.body.classList.add('is-menu-open');
          burger.setAttribute('aria-expanded', 'true');
          mobileMenu.removeAttribute('aria-hidden');
        }
      });

      mobileMenu.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
          closeMenu();
        }
      });

      document.addEventListener('click', (e) => {
        if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
          closeMenu();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
    }

    // Delegate smooth anchor scrolling inside main
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      // Check if it's an artist quick-view link
      if (hash.startsWith('#artist-') || hash.startsWith('#director-')) {
        e.preventDefault();
        const artistName = link.textContent.trim();
        openArtistLightboxByName(artistName);
        return;
      }

      const target = document.querySelector(hash);
      const mainEl = document.querySelector('main');
      if (target && mainEl) {
        e.preventDefault();
        closeMenu();
        const targetTop = target.getBoundingClientRect().top - mainEl.getBoundingClientRect().top + mainEl.scrollTop;
        if (lenisInstance) {
          lenisInstance.scrollTo(targetTop, { duration: 1.1 });
        } else {
          mainEl.scrollTo({ top: targetTop, behavior: 'smooth' });
        }
      }
    });
  }

  /* ==========================================================================
     3. Smooth Scroll (Lenis on <main> scroller)
     ========================================================================== */
  function initSmoothScroll() {
    const mainEl = document.querySelector('main');
    const contentEl = document.querySelector('.main');
    if (!mainEl || !contentEl) return;

    if (typeof Lenis !== 'undefined') {
      try {
        lenisInstance = new Lenis({
          wrapper: mainEl,
          content: contentEl,
          lerp: 0.1,
          smoothWheel: true,
        });
        window.lenis = lenisInstance;

        if (typeof ScrollTrigger !== 'undefined') {
          lenisInstance.on('scroll', ScrollTrigger.update);
        }

        if (typeof gsap !== 'undefined') {
          gsap.ticker.add((time) => {
            lenisInstance.raf(time * 1000);
          });
          gsap.ticker.lagSmoothing(0);
        } else {
          const raf = (time) => {
            lenisInstance.raf(time);
            requestAnimationFrame(raf);
          };
          requestAnimationFrame(raf);
        }
      } catch (_) {}
    }

    // Toggle top center small logo when scrolled past hero & update active navbar link
    const navLogo = document.getElementById('js-navbar-logo');
    const navLinks = Array.from(document.querySelectorAll('.c-navbar__links-link[href^="#"]'));
    const sectionIds = ['top', 'news', 'about', 'artists', 'production', 'footer'];

    function updateActiveNavLink() {
      const scrollPos = mainEl.scrollTop + 140;
      let currentSectionId = '';

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const sec = document.getElementById(id);
        if (sec && scrollPos >= sec.offsetTop) {
          currentSectionId = id;
          break;
        }
      }

      navLinks.forEach((link) => {
        const href = link.getAttribute('href');
        link.classList.toggle('is-active', href === `#${currentSectionId}`);
      });
    }

    mainEl.addEventListener(
      'scroll',
      () => {
        if (navLogo) {
          navLogo.classList.toggle('is-scrolled', mainEl.scrollTop > 280);
        }
        updateActiveNavLink();
      },
      { passive: true }
    );
    updateActiveNavLink();
  }

  /* ==========================================================================
     4. Hero Logo & 5-Column Parallax Gallery (Desktop + Mobile)
     ========================================================================== */
  function renderHeroText(hero) {
    if (!hero) return;
    const srTitle = document.getElementById('hero-sr-title');
    const tagline = document.getElementById('hero-tagline');
    if (srTitle && hero.srTitle) srTitle.textContent = hero.srTitle;
    if (tagline && hero.tagline) tagline.textContent = hero.tagline;
  }

  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function renderGallerySection(columns, heroConfig, isInitialLoad) {
    const thisRenderGen = ++currentRenderGen;
    galleryCleanups.forEach((fn) => {
      try {
        fn();
      } catch (_) {}
    });
    galleryCleanups = [];

    const galleryEl = document.getElementById('home-gallery');
    const parallaxEl = document.getElementById('home-parallax');
    const parallaxInnerEl = document.getElementById('home-parallax-inner');
    if (!galleryEl || !parallaxEl || !parallaxInnerEl || !Array.isArray(columns)) return;

    const sourceCols = heroConfig && heroConfig.shuffleColumns ? shuffleArray(columns) : columns;
    const activeCols = sourceCols.slice(0, 5);

    galleryEl.innerHTML = '';

    activeCols.forEach((col, colIdx) => {
      const colNum = colIdx + 1;
      const colWrap = document.createElement('div');
      colWrap.className = 'c-home__gallery-col';

      const itemEl = document.createElement('div');
      itemEl.className = 'c-home__gallery-item';
      itemEl.dataset.col = String(colNum);
      itemEl.dataset.artistName = col.name || 'Artist';
      itemEl.dataset.href = sanitizeUrl(col.href, '#artists');
      itemEl.setAttribute('role', 'button');
      itemEl.setAttribute('tabindex', '0');
      itemEl.setAttribute('aria-label', `View portfolio for ${col.name || 'Artist'}`);

      itemEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openArtistLightboxByName(col.name, itemEl);
        }
      });

      // Build cycle list: first item is media[0], followed by cycleMedia
      const visibleMedia = Array.isArray(col.media) ? col.media.slice(0, 4) : [];
      const extraCycle = Array.isArray(col.cycleMedia) ? col.cycleMedia : [];
      const fullCycleList = [
        ...(visibleMedia[0]
          ? [
              {
                t: visibleMedia[0].type === 'video' ? 'vid' : 'img',
                url: visibleMedia[0].src,
                poster: visibleMedia[0].poster || '',
                color: visibleMedia[0].color || '#d4c5b9',
              },
            ]
          : []),
        ...extraCycle.map((c) => ({
          t: c.type === 'video' ? 'vid' : 'img',
          url: c.src,
          poster: c.poster || '',
          color: c.color || '#d4c5b9',
        })),
      ];
      itemEl.dataset.cycle = JSON.stringify(fullCycleList);

      visibleMedia.forEach((m, mIdx) => {
        const wrap = document.createElement('div');
        wrap.className = 'c-home__gallery-media-wrap';
        if (m.color) {
          wrap.style.backgroundColor = sanitizeHexColor(m.color, '#e8e8e8');
        }

        const isVideo = m.type === 'video' || String(m.src || '').endsWith('.mp4');

        if (mIdx === 0) {
          // Card #1: Create both image and video elements so cycling between types never drops DOM nodes
          const img = document.createElement('img');
          img.className = 'c-home__gallery-media c-home__gallery-media--img';
          img.src = !isVideo ? sanitizeUrl(m.src, '', true) : '';
          img.width = m.width || 912;
          img.height = m.height || 1140;
          img.alt = `${col.name || 'Artist'} portfolio image 1`;
          img.fetchPriority = 'high';
          if (isVideo) img.style.cssText = 'display:none;opacity:0';

          const vid = document.createElement('video');
          vid.className = 'c-home__gallery-media c-home__gallery-media--vid';
          vid.autoplay = true;
          vid.muted = true;
          vid.loop = true;
          vid.playsInline = true;
          vid.setAttribute('muted', '');
          vid.setAttribute('playsinline', '');
          if (isVideo) {
            vid.src = sanitizeUrl(m.src, '', true);
            if (m.poster) vid.poster = sanitizeUrl(m.poster, '', true);
          } else {
            vid.style.cssText = 'display:none;opacity:0';
          }

          wrap.appendChild(img);
          wrap.appendChild(vid);
        } else if (isVideo) {
          const vid = document.createElement('video');
          vid.className = 'c-home__gallery-media';
          vid.src = sanitizeUrl(m.src, '', true);
          if (m.poster) vid.poster = sanitizeUrl(m.poster, '', true);
          vid.autoplay = true;
          vid.muted = true;
          vid.loop = true;
          vid.playsInline = true;
          vid.setAttribute('muted', '');
          vid.setAttribute('playsinline', '');
          wrap.appendChild(vid);
        } else {
          const img = document.createElement('img');
          img.className = 'c-home__gallery-media';
          img.src = sanitizeUrl(m.src, '', true);
          img.width = m.width || 912;
          img.height = m.height || 1140;
          img.alt = `${col.name || 'Artist'} portfolio image ${mIdx + 1}`;
          img.loading = 'lazy';
          wrap.appendChild(img);
        }

        itemEl.appendChild(wrap);
      });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'c-home__gallery-item-name';
      nameSpan.textContent = col.name || 'Artist';
      itemEl.appendChild(nameSpan);

      colWrap.appendChild(itemEl);
      galleryEl.appendChild(colWrap);
    });

    if (typeof gsap === 'undefined') {
      document.querySelectorAll('.c-home__gallery-media, .c-home__tagline').forEach((el) => {
        el.style.opacity = '1';
      });
      return;
    }

    // Column elements & quickTo vertical parallax controllers
    const col1 = galleryEl.querySelector("[data-col='1']");
    const col2 = galleryEl.querySelector("[data-col='2']");
    const col3 = galleryEl.querySelector("[data-col='3']");
    const col4 = galleryEl.querySelector("[data-col='4']");
    const col5 = galleryEl.querySelector("[data-col='5']");
    const colEls = [col1, col2, col3, col4, col5];

    const y1 = col1 ? gsap.quickTo(col1, 'y', { duration: 0.5, ease: 'power3' }) : null;
    const y2 = col2 ? gsap.quickTo(col2, 'y', { duration: 0.8, ease: 'power3' }) : null;
    const y3 = col3 ? gsap.quickTo(col3, 'y', { duration: 0.2, ease: 'power3' }) : null;
    const y4 = col4 ? gsap.quickTo(col4, 'y', { duration: 0.3, ease: 'power3' }) : null;
    const y5 = col5 ? gsap.quickTo(col5, 'y', { duration: 0.6, ease: 'power3' }) : null;

    let maxScrollShift = 0;
    let wheelY = 0;

    function updateParallaxHeight() {
      const visibleCols = colEls.filter(Boolean).filter((el) => {
        const parentCol = el.closest('.c-home__gallery-col');
        return !parentCol || getComputedStyle(parentCol).display !== 'none';
      });
      const heights = visibleCols.map((el) => (el.clientHeight ? el.clientHeight / 2 : 0));
      maxScrollShift = Math.max(...heights, 0);

      const containerHeight = visibleCols.reduce((acc, el) => {
        const pb = parseFloat(getComputedStyle(el).paddingBottom) || 0;
        return Math.max(acc, el.offsetTop + el.clientHeight - pb);
      }, 0);
      if (containerHeight > 0) {
        parallaxEl.style.height = `${containerHeight}px`;
      }
    }

    updateParallaxHeight();
    window.addEventListener('resize', updateParallaxHeight, { passive: true });
    galleryCleanups.push(() => window.removeEventListener('resize', updateParallaxHeight));

    let isParallaxVisible = true;
    const visObserver = new IntersectionObserver(
      ([entry]) => {
        isParallaxVisible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    visObserver.observe(parallaxEl);
    galleryCleanups.push(() => visObserver.disconnect());

    let entranceDone = false;
    let cycleTimeline = null;
    let cycleResumeTimer = null;

    const mainEl = document.querySelector('main');
    const getScrollY = () => (mainEl ? mainEl.scrollTop : window.scrollY || 0);

    function onWheel(e) {
      if (!isParallaxVisible || window.matchMedia('(max-width: 991.98px)').matches) return;
      wheelY -= e.deltaY / 2;
      wheelY = gsap.utils.clamp(-maxScrollShift, 0, wheelY);
      if (y1) y1(wheelY);
      if (y2) y2(wheelY);
      if (y3) y3(wheelY);
      if (y4) y4(wheelY);
      if (y5) y5(wheelY);
    }

    function onScrollCheck() {
      if (!cycleTimeline || !entranceDone) return;
      if (getScrollY() > 10) {
        cycleTimeline.pause();
        if (cycleResumeTimer) {
          clearTimeout(cycleResumeTimer);
          cycleResumeTimer = null;
        }
      } else if (cycleTimeline.paused() && !cycleResumeTimer) {
        cycleResumeTimer = setTimeout(() => {
          cycleResumeTimer = null;
          if (getScrollY() <= 10) {
            cycleTimeline.play();
          }
        }, 2500);
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true });
    if (mainEl) mainEl.addEventListener('scroll', onScrollCheck, { passive: true });
    galleryCleanups.push(() => {
      window.removeEventListener('wheel', onWheel);
      if (mainEl) mainEl.removeEventListener('scroll', onScrollCheck);
      if (cycleResumeTimer) clearTimeout(cycleResumeTimer);
    });

    // Build Idle Media Cycling Timeline (exact vivmgmt.com choreography)
    const preloadImg = (url) => {
      if (!url) return;
      const img = new Image();
      img.src = url;
    };

    const cycleStates = colEls
      .filter(Boolean)
      .filter((el) => {
        const parentCol = el.closest('.c-home__gallery-col');
        return !parentCol || getComputedStyle(parentCol).display !== 'none';
      })
      .map((colEl) => {
        const wraps = Array.from(colEl.querySelectorAll('.c-home__gallery-media-wrap')).slice(0, 2);
        if (!wraps.length) return null;
        const firstWrap = wraps[0];
        const imgNode = firstWrap.querySelector('img.c-home__gallery-media');
        const vidNode = firstWrap.querySelector('video.c-home__gallery-media');
        if (!imgNode && !vidNode) return null;

        const secondMediaEls = wraps[1] ? Array.from(wraps[1].querySelectorAll('.c-home__gallery-media')) : [];
        let cycleList = [];
        try {
          cycleList = JSON.parse(colEl.dataset.cycle || '[]');
        } catch (_) {}

        if (cycleList.length > 1 && cycleList[1].t === 'img') {
          preloadImg(cycleList[1].url);
        }

        wraps.forEach((w) => gsap.set(w, { y: 0, willChange: 'transform' }));

        const isCurrentlyVid = vidNode && vidNode.style.display !== 'none';

        return {
          wraps,
          firstWrap,
          imgNode,
          vidNode,
          secondMediaEls,
          cycleList,
          index: 0,
          currentType: isCurrentlyVid ? 'vid' : 'img',
        };
      })
      .filter(Boolean);

    if (cycleStates.length > 0) {
      const pauseGap = 0.12;
      const tl = gsap.timeline({ repeat: -1, paused: true });
      let cursor = 0;

      cycleStates.forEach((st, idx) => {
        const startT = cursor;
        tl.to(st.wraps, { y: 70, duration: 1, ease: 'power1.inOut' }, startT);

        tl.call(
          () => {
            const activeMedia = st.currentType === 'vid' ? st.vidNode : st.imgNode;
            gsap.to([activeMedia, ...st.secondMediaEls].filter(Boolean), {
              opacity: 0,
              duration: 0.9,
              ease: 'sine.inOut',
            });
          },
          [],
          startT + 0.1
        );

        tl.to({}, { duration: pauseGap }, startT + 1);

        tl.call(
          () => {
            if (!st.cycleList.length) return;
            st.index = (st.index + 1) % st.cycleList.length;
            const nextItem = st.cycleList[st.index];

            if (nextItem.t === 'vid') {
              if (st.imgNode) gsap.set(st.imgNode, { display: 'none' });
              if (st.vidNode) {
                st.vidNode.muted = true;
                st.vidNode.src = nextItem.url;
                if (nextItem.poster) st.vidNode.poster = nextItem.poster;
                gsap.set(st.vidNode, { display: 'block', opacity: 0 });
                st.vidNode.play().catch(() => {});
              }
              st.currentType = 'vid';
            } else {
              if (st.vidNode) {
                st.vidNode.pause();
                gsap.set(st.vidNode, { display: 'none' });
              }
              if (st.imgNode) {
                st.imgNode.src = nextItem.url;
                gsap.set(st.imgNode, { display: 'block', opacity: 0 });
              }
              st.currentType = 'img';

              const upcoming = st.cycleList[(st.index + 1) % st.cycleList.length];
              if (upcoming && upcoming.t === 'img') preloadImg(upcoming.url);
            }

            if (nextItem.color) {
              gsap.to(st.firstWrap, {
                backgroundColor: nextItem.color,
                duration: 0.5,
                ease: 'sine.inOut',
              });
            }
          },
          [],
          startT + 1 + pauseGap
        );

        const returnT = startT + 1 + pauseGap;
        tl.to(st.wraps, { y: 0, duration: 1, ease: 'power1.inOut' }, returnT);

        tl.call(
          () => {
            const activeMedia = st.currentType === 'vid' ? st.vidNode : st.imgNode;
            gsap.to([activeMedia, ...st.secondMediaEls].filter(Boolean), {
              opacity: 1,
              duration: 0.85,
              ease: 'sine.inOut',
            });
          },
          [],
          returnT
        );

        const endT = startT + 2.12;
        if (idx === cycleStates.length - 1) {
          tl.to({}, { duration: 3 }, endT);
          cursor = endT + 1.5;
        } else {
          cursor = endT - 1.5;
        }
      });

      cycleTimeline = tl;
      galleryCleanups.push(() => tl.kill());
    }

    // Hero SVG Clip-Path Reveal & Scale-In Entrance
    const clipRect1 = document.getElementById('clip-group1-rect');
    const clipRect2 = document.getElementById('clip-group2-rect');
    const taglineEl = document.getElementById('hero-tagline');
    const allMediaEls = Array.from(galleryEl.querySelectorAll('.c-home__gallery-media')).filter(
      (el) => el.style.display !== 'none'
    );

    const alreadyLoaded = !isInitialLoad || Boolean(sessionStorage.getItem('viv-home-loader'));

    if (alreadyLoaded) {
      if (clipRect1) gsap.set(clipRect1, { attr: { x: 0, width: 543 } });
      if (clipRect2) gsap.set(clipRect2, { attr: { width: 543 } });
      if (taglineEl) gsap.set(taglineEl, { opacity: 1 });
      gsap.set(parallaxEl, { scale: 1, y: 0 });
      gsap.set(allMediaEls, { opacity: 1 });
      allMediaEls
        .filter((el) => el.tagName.toLowerCase() === 'video')
        .forEach((v) => {
          v.muted = true;
          v.play().catch(() => {});
        });
      entranceDone = true;
      updateParallaxHeight();
      if (cycleTimeline && getScrollY() <= 10) {
        cycleTimeline.play();
      }
    } else {
      gsap.set(parallaxEl, { scale: 1.3, y: '5vh', transformOrigin: 'center top' });
      gsap.set(allMediaEls, { opacity: 0 });

      const firstImgs = Array.from(
        galleryEl.querySelectorAll('.c-home__gallery-media-wrap:first-child img.c-home__gallery-media')
      ).filter((img) => img.src);

      const waitImgs = Promise.all(
        firstImgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener('load', res, { once: true });
                img.addEventListener('error', res, { once: true });
              })
        )
      );
      const timeout = new Promise((res) => setTimeout(res, 1200));

      Promise.race([waitImgs, timeout]).then(() => {
        if (thisRenderGen !== currentRenderGen) return;
        const fadeTl = gsap.timeline();
        fadeTl.to(allMediaEls, { opacity: 1, duration: 0.8, ease: 'power1.out', stagger: 0.04 }, 0);
        fadeTl.call(() => {
          allMediaEls
            .filter((el) => el.tagName.toLowerCase() === 'video')
            .forEach((v) => {
              v.muted = true;
              v.play().catch(() => {});
            });
        });

        const zoomTl = gsap.timeline({
          delay: 0.5,
          onComplete: () => {
            sessionStorage.setItem('viv-home-loader', '1');
            entranceDone = true;
            updateParallaxHeight();
            if (cycleTimeline && getScrollY() <= 10) {
              cycleTimeline.play();
            }
          },
        });
        zoomTl.to(parallaxEl, { scale: 1, y: 0, duration: 1.6, ease: 'power2.out' }, 0);

        if (clipRect1 && clipRect2) {
          const logoTl = gsap.timeline({ delay: 0.5 });
          logoTl.to(clipRect1, { attr: { x: 0, width: 543 }, duration: 1.6, ease: 'power3.inOut' }, 0);
          logoTl.to(clipRect2, { attr: { width: 543 }, duration: 1.6, ease: 'power3.inOut' }, 0);
          if (taglineEl) {
            logoTl.to(taglineEl, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.6);
          }
          galleryCleanups.push(() => logoTl.kill());
        }

        galleryCleanups.push(() => {
          fadeTl.kill();
          zoomTl.kill();
        });
      });
    }

    // Desktop Horizontal Mouse Pan (130vw inner container)
    let currentPanX = 0;
    let targetPanX = 0;
    let centerPanX = 0;
    let panLoopActive = true;

    function recalcPanBounds(resetToCenter = false) {
      if (window.matchMedia('(max-width: 991.98px)').matches) {
        parallaxInnerEl.style.transform = '';
        return;
      }
      const outerW = parallaxEl.clientWidth;
      const innerW = parallaxInnerEl.scrollWidth;
      const maxPan = Math.max(0, innerW - outerW);
      parallaxEl._maxPanX = maxPan;
      centerPanX = -maxPan / 2;
      if (resetToCenter) {
        currentPanX = centerPanX;
        targetPanX = centerPanX;
        parallaxInnerEl.style.transform = `translate3d(${currentPanX}px, 0, 0)`;
      } else {
        currentPanX = Math.min(0, Math.max(-maxPan, currentPanX));
        targetPanX = Math.min(0, Math.max(-maxPan, targetPanX));
      }
    }

    function updatePanFromClientX(clientX) {
      if (!entranceDone || window.matchMedia('(max-width: 991.98px)').matches) return;
      const rect = parallaxEl.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      targetPanX = -(parallaxEl._maxPanX || 0) * ratio;
    }

    const onMouseMove = (e) => updatePanFromClientX(e.clientX);
    const onMouseLeave = () => {
      targetPanX = centerPanX;
    };
    const onResizePan = () => recalcPanBounds(false);

    recalcPanBounds(true);
    window.addEventListener('resize', onResizePan, { passive: true });
    parallaxEl.addEventListener('mousemove', onMouseMove, { passive: true });
    parallaxEl.addEventListener('mouseleave', onMouseLeave, { passive: true });

    (function tickPan() {
      if (!panLoopActive) return;
      if (!window.matchMedia('(max-width: 991.98px)').matches) {
        currentPanX += 0.05 * (targetPanX - currentPanX);
        parallaxInnerEl.style.transform = `translate3d(${currentPanX}px, 0, 0)`;
      }
      requestAnimationFrame(tickPan);
    })();

    galleryCleanups.push(() => {
      panLoopActive = false;
      window.removeEventListener('resize', onResizePan);
      parallaxEl.removeEventListener('mousemove', onMouseMove);
      parallaxEl.removeEventListener('mouseleave', onMouseLeave);
    });

    // Click and touch handler on gallery column to open artist quick-view portfolio
    let downX = 0;
    let downY = 0;
    const onMouseDown = (e) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onClickGallery = (e) => {
      const colItem = e.target.closest('.c-home__gallery-item');
      if (!colItem) return;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      openArtistLightboxByName(colItem.dataset.artistName, colItem);
    };

    let touchX = 0;
    let touchY = 0;
    const onTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchX = e.touches[0].clientX;
        touchY = e.touches[0].clientY;
      }
    };
    const onTouchEnd = (e) => {
      const colItem = e.target.closest('.c-home__gallery-item');
      if (!colItem || !e.changedTouches || !e.changedTouches[0]) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      if (Math.hypot(endX - touchX, endY - touchY) < 10) {
        openArtistLightboxByName(colItem.dataset.artistName, colItem);
      }
    };

    galleryEl.addEventListener('mousedown', onMouseDown);
    galleryEl.addEventListener('click', onClickGallery);
    galleryEl.addEventListener('touchstart', onTouchStart, { passive: true });
    galleryEl.addEventListener('touchend', onTouchEnd);
    galleryCleanups.push(() => {
      galleryEl.removeEventListener('mousedown', onMouseDown);
      galleryEl.removeEventListener('click', onClickGallery);
      galleryEl.removeEventListener('touchstart', onTouchStart);
      galleryEl.removeEventListener('touchend', onTouchEnd);
    });
  }

  /* ==========================================================================
     5. Editorial Scroll-Scrubbed Strapline
     ========================================================================== */
  function renderStraplineSection(strapline) {
    straplineCleanups.forEach((fn) => {
      try {
        fn();
      } catch (_) {}
    });
    straplineCleanups = [];

    const el = document.getElementById('home-strapline');
    if (!el || !strapline) return;

    const rawText = strapline.text || 'ViV is an artist management and production company.';
    const uprightSet = new Set(
      String(strapline.uprightWords || 'is, an, and')
        .split(',')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
    );

    el.setAttribute('aria-label', rawText);
    const words = rawText.trim().split(/\s+/);

    el.innerHTML = words
      .map((word) => {
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const isItalic = !uprightSet.has(cleanWord);
        const charsHtml = Array.from(word)
          .map((ch) => `<span class="strap-char" aria-hidden="true">${escapeHtml(ch)}</span>`)
          .join('');
        return `<span class="strap-word"${isItalic ? ' style="font-style:italic"' : ''} aria-hidden="true">${charsHtml}</span>`;
      })
      .join(' ');

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const charEls = el.querySelectorAll('.strap-char');
    const mainEl = document.querySelector('main');

    const tween = gsap.fromTo(
      charEls,
      {
        opacity: 0,
        scale: 0.6,
        rotationZ: () => gsap.utils.random(-20, 20),
      },
      {
        ease: 'power4',
        opacity: 1,
        scale: 1,
        rotationZ: 0,
        stagger: 0.03,
        scrollTrigger: {
          trigger: el,
          scroller: mainEl,
          start: 'top bottom',
          end: 'bottom 30%',
          scrub: true,
        },
      }
    );

    straplineCleanups.push(() => {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
    });
  }

  /* ==========================================================================
     6. News Masonry Grid (3-Column Desktop Packery Layout + Mobile Stack)
     ========================================================================== */
  function renderNewsSection(news) {
    newsCleanups.forEach((fn) => {
      try {
        fn();
      } catch (_) {}
    });
    newsCleanups = [];

    if (!news) return;

    const headingEl = document.getElementById('news-heading');
    const allBtn = document.getElementById('news-all-btn');
    const gridEl = document.getElementById('news-grid');

    if (headingEl) headingEl.textContent = news.heading || 'News';
    if (allBtn) {
      allBtn.textContent = news.allButtonText || 'All News';
      allBtn.setAttribute('href', sanitizeUrl(news.allButtonLink, '#news'));
    }

    if (!gridEl || !Array.isArray(news.items)) return;

    gridEl.innerHTML = news.items
      .map((item) => {
        const w = item.width || 1500;
        const h = item.height || 2000;
        const bg = sanitizeHexColor(item.color, '#e8e8e8');
        const isVid = item.type === 'video' || String(item.src || '').endsWith('.mp4');
        const safeSrc = escapeHtml(sanitizeUrl(item.src, '', true));
        const safePoster = escapeHtml(sanitizeUrl(item.poster, '', true));

        const mediaHtml = isVid
          ? `<video class="c-home__news-item-media" src="${safeSrc}"${
              safePoster ? ` poster="${safePoster}"` : ''
            } autoplay muted loop playsinline style="aspect-ratio:${w}/${h}"></video>`
          : `<img class="c-home__news-item-media" src="${safeSrc}" width="${w}" height="${h}" alt="${escapeHtml(
              item.title
            )}" loading="lazy">`;

        return `
        <div class="c-home__news-item" data-news-title="${escapeHtml(item.title)}">
          <a href="${escapeHtml(sanitizeUrl(item.href, '#news'))}" class="c-home__news-item-link">
            <div class="c-home__news-item-media-wrap" style="background-color:${bg};aspect-ratio:${w}/${h}">
              ${mediaHtml}
            </div>
            <h3 class="c-home__news-item-title">${escapeHtml(item.title)}</h3>
          </a>
        </div>`;
      })
      .join('');

    // IntersectionObserver fade-in (.is-loaded) matching vivmgmt.com ri()
    const itemEls = Array.from(gridEl.querySelectorAll('.c-home__news-item'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const mediaEl = entry.target.querySelector('.c-home__news-item-media');
          if (mediaEl) {
            const markLoaded = () => setTimeout(() => mediaEl.classList.add('is-loaded'), 350);
            if (mediaEl.tagName.toLowerCase() !== 'img' || mediaEl.complete) {
              markLoaded();
            } else {
              mediaEl.addEventListener('load', markLoaded, { once: true });
              mediaEl.addEventListener('error', markLoaded, { once: true });
            }
          }
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    itemEls.forEach((el) => io.observe(el));
    newsCleanups.push(() => io.disconnect());

    // Packery-equivalent 3-column masonry layout on desktop (>= 992px)
    function layoutNewsMasonry() {
      const items = Array.from(gridEl.querySelectorAll('.c-home__news-item'));
      if (!items.length) {
        gridEl.style.height = '0px';
        return;
      }

      if (window.matchMedia('(max-width: 991.98px)').matches) {
        gridEl.style.height = '';
        items.forEach((item) => {
          item.style.position = '';
          item.style.left = '';
          item.style.top = '';
          item.style.width = '';
        });
        return;
      }

      const gutter = 10;
      const gridW = gridEl.clientWidth;
      const colW = (gridW - gutter * 2) / 3;
      const colHeights = [0, 0, 0];

      items.forEach((item) => {
        item.style.position = 'absolute';
        item.style.width = `${colW}px`;

        // Find shortest column
        let minCol = 0;
        if (colHeights[1] < colHeights[minCol]) minCol = 1;
        if (colHeights[2] < colHeights[minCol]) minCol = 2;

        const x = minCol * (colW + gutter);
        const y = colHeights[minCol];

        item.style.left = `${x}px`;
        item.style.top = `${y}px`;

        colHeights[minCol] += item.offsetHeight + 50;
      });

      gridEl.style.height = `${Math.max(...colHeights, 0)}px`;
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }

    layoutNewsMasonry();
    window.addEventListener('resize', layoutNewsMasonry, { passive: true });
    newsCleanups.push(() => window.removeEventListener('resize', layoutNewsMasonry));
  }

  /* ==========================================================================
     7. Full-Screen Parallax Footer & Cursor Hover Reveals
     ========================================================================== */
  function renderFooterSection(footer) {
    footerCleanups.forEach((fn) => {
      try {
        fn();
      } catch (_) {}
    });
    footerCleanups = [];

    document.querySelectorAll('.hover-reveal').forEach((el) => el.remove());

    if (!footer) return;

    // 1. Straplines
    const strapContainer = document.getElementById('footer-straplines');
    if (strapContainer && Array.isArray(footer.straplines)) {
      strapContainer.innerHTML = footer.straplines
        .map((line) => `<p>${formatEmphasisHtml(line)}</p>`)
        .join('');
    }

    // 2. Artists Links with data-color, data-img, data-video
    const artistsList = document.getElementById('footer-artists-list');
    if (artistsList && Array.isArray(footer.artists)) {
      const titleHtml = `<li class="c-footer__links-item"><span class="c-footer__links-title">${escapeHtml(
        footer.artistsTitle || 'Artists'
      )}</span></li>`;
      const itemsHtml = footer.artists
        .map((a) => {
          const safeColor = escapeHtml(sanitizeHexColor(a.color, '#D3B6AA'));
          const safeImg = escapeHtml(sanitizeUrl(a.image, '', true));
          const safeVid = escapeHtml(sanitizeUrl(a.video, '', true));
          return `
          <li class="c-footer__links-item">
            <a href="${escapeHtml(sanitizeUrl(a.href, '#artists'))}"
               class="c-footer__links-link"
               data-color="${safeColor}"
               data-img="${safeImg}"
               ${safeVid ? `data-video="${safeVid}"` : ''}>${escapeHtml(a.name)}</a>
          </li>`;
        })
        .join('');
      artistsList.innerHTML = titleHtml + itemsHtml;
    }

    // 3. Explore Links
    const exploreList = document.getElementById('footer-explore-list');
    if (exploreList && Array.isArray(footer.exploreLinks)) {
      const titleHtml = `<li class="c-footer__links-item"><span class="c-footer__links-title">${escapeHtml(
        footer.exploreTitle || 'Explore'
      )}</span></li>`;
      const itemsHtml = footer.exploreLinks
        .map(
          (l) => `
          <li class="c-footer__links-item">
            <a href="${escapeHtml(sanitizeUrl(l.href, '#'))}" class="c-footer__links-link">${escapeHtml(l.label)}</a>
          </li>`
        )
        .join('');
      exploreList.innerHTML = titleHtml + itemsHtml;
    }

    // 4. Connect Links
    const connectList = document.getElementById('footer-connect-list');
    if (connectList && Array.isArray(footer.connectLinks)) {
      const titleHtml = `<li class="c-footer__links-item"><span class="c-footer__links-title">${escapeHtml(
        footer.connectTitle || 'Connect'
      )}</span></li>`;
      const itemsHtml = footer.connectLinks
        .map(
          (l) => `
          <li class="c-footer__links-item">
            <a href="${escapeHtml(sanitizeUrl(l.href, '#'))}"
               class="c-footer__links-link"
               ${l.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(l.label)}</a>
          </li>`
        )
        .join('');
      connectList.innerHTML = titleHtml + itemsHtml;
    }

    // 5. Copyright
    const copyEl = document.getElementById('footer-copyright');
    if (copyEl && footer.copyright) {
      copyEl.textContent = footer.copyright;
    }

    const footerEl = document.getElementById('footer');
    const mainEl = document.querySelector('main');
    if (!footerEl || typeof gsap === 'undefined') return;

    // Footer Parallax ScrollTrigger + Navbar Auto-Hide
    if (typeof ScrollTrigger !== 'undefined') {
      const innerEl = footerEl.querySelector('[data-footer-parallax-inner]');
      const darkEl = footerEl.querySelector('[data-footer-parallax-dark]');

      const parallaxTl = gsap.timeline({
        scrollTrigger: {
          trigger: footerEl,
          scroller: mainEl,
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            document.documentElement.classList.toggle('is-nav-hidden', self.progress > 0.5);
          },
        },
      });

      if (innerEl) parallaxTl.fromTo(innerEl, { yPercent: -25 }, { yPercent: 0, ease: 'linear' }, 0);
      if (darkEl) parallaxTl.fromTo(darkEl, { opacity: 0.5 }, { opacity: 0.1, ease: 'linear' }, 0);

      footerCleanups.push(() => {
        if (parallaxTl.scrollTrigger) parallaxTl.scrollTrigger.kill();
        parallaxTl.kill();
      });

      // Footer "ViV" SVG Split-Clip Reveal
      const g1Rect = document.getElementById('footer-g1-rect');
      const g2Rect = document.getElementById('footer-g2-rect');
      if (g1Rect && g2Rect) {
        gsap.set(g1Rect, { attr: { x: 586, width: 0 } });
        gsap.set(g2Rect, { attr: { x: 0, width: 0 } });

        const logoTl = gsap.timeline({
          scrollTrigger: {
            trigger: g1Rect.closest('svg'),
            scroller: mainEl,
            start: 'top bottom',
          },
        });
        logoTl.to(g1Rect, { attr: { x: 0, width: 586 }, duration: 1.6, ease: 'power3.inOut' }, 0);
        logoTl.to(g2Rect, { attr: { width: 586 }, duration: 1.6, ease: 'power3.inOut' }, 0);

        footerCleanups.push(() => {
          if (logoTl.scrollTrigger) logoTl.scrollTrigger.kill();
          logoTl.kill();
        });
      }
    }

    // Cursor Hover Reveal for Footer Artist Links (Singleton Pattern to eliminate DOM bloat)
    const abortCtrl = new AbortController();
    const { signal } = abortCtrl;
    footerCleanups.push(() => abortCtrl.abort());

    let revealEl = document.querySelector('.hover-reveal');
    if (!revealEl) {
      revealEl = document.createElement('div');
      revealEl.className = 'hover-reveal';
      revealEl.innerHTML = `<div class="hover-reveal__inner"></div>`;
      document.body.appendChild(revealEl);
    }
    const inner = revealEl.querySelector('.hover-reveal__inner');

    footerCleanups.push(() => {
      if (revealEl && revealEl.parentNode) {
        revealEl.remove();
      }
    });

    const positionReveal = (e) => {
      const maxLeft = window.innerWidth - 260;
      const maxTop = window.innerHeight - 340;
      revealEl.style.left = `${Math.min(maxLeft, e.clientX + 20)}px`;
      revealEl.style.top = `${Math.min(maxTop, e.clientY + 20)}px`;
    };

    footerEl.querySelectorAll('.c-footer__links-link[data-img], .c-footer__links-link[data-video]').forEach((link) => {
      const vidUrl = link.dataset.video;
      const imgUrl = link.dataset.img;
      if (!vidUrl && !imgUrl) return;

      link.addEventListener(
        'mouseenter',
        (e) => {
          if (window.matchMedia('(max-width: 991.98px)').matches) return;
          positionReveal(e);

          const safeCssImg = imgUrl ? sanitizeCssUrl(imgUrl) : '';
          inner.innerHTML = vidUrl
            ? `<video class="hover-reveal__img" src="${escapeHtml(
                vidUrl
              )}" poster="${escapeHtml(imgUrl || '')}" autoplay muted loop playsinline></video>`
            : `<div class="hover-reveal__img"${safeCssImg ? ` style="background-image:url('${safeCssImg}')"` : ''}></div>`;

          const media = inner.firstElementChild;
          gsap.killTweensOf([inner, media].filter(Boolean));
          gsap.set(revealEl, { opacity: 1 });
          gsap
            .timeline()
            .fromTo(inner, { x: '-100%', y: '-100%' }, { x: '0%', y: '0%', duration: 0.4, ease: 'power4.out' }, 0)
            .fromTo(media, { x: '100%', y: '100%' }, { x: '0%', y: '0%', duration: 0.4, ease: 'power4.out' }, 0);
          if (link.dataset.color) {
            footerEl.style.backgroundColor = link.dataset.color;
          }
        },
        { signal }
      );

      link.addEventListener(
        'mousemove',
        (e) => {
          requestAnimationFrame(() => positionReveal(e));
        },
        { signal }
      );

      link.addEventListener(
        'mouseleave',
        () => {
          const media = inner.firstElementChild;
          gsap.killTweensOf([inner, media].filter(Boolean));
          gsap
            .timeline({ onComplete: () => gsap.set(revealEl, { opacity: 0 }) })
            .to(inner, { x: '100%', y: '100%', duration: 0.3, ease: 'power4.out' }, 0)
            .to(media, { x: '-100%', y: '-100%', duration: 0.3, ease: 'power4.out' }, 0);
          footerEl.style.backgroundColor = '';
        },
        { signal }
      );
    });
  }

  /* ==========================================================================
     8. Quick-View Artist Portfolio Lightbox
     ========================================================================== */
  let lastFocusedElement = null;

  function initLightbox() {
    const lb = document.getElementById('viv-lightbox');
    const closeBtn = document.getElementById('viv-lightbox-close');
    if (!lb || !closeBtn) return;

    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-lightbox-open');
      if (lenisInstance) lenisInstance.start();
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }
    };

    closeBtn.addEventListener('click', close);

    // Backdrop click closes lightbox
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.classList.contains('viv-lightbox__body')) {
        close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb.classList.contains('is-open')) {
        e.preventDefault();
        close();
      }
    });
  }

  function openArtistLightboxByName(name, triggerElement) {
    if (!currentSiteData || !Array.isArray(currentSiteData.galleryColumns)) return;
    const lb = document.getElementById('viv-lightbox');
    const titleEl = document.getElementById('viv-lightbox-title');
    const gridEl = document.getElementById('viv-lightbox-grid');
    const closeBtn = document.getElementById('viv-lightbox-close');
    if (!lb || !titleEl || !gridEl) return;

    const targetName = String(name || '').trim().toLowerCase();
    const col =
      currentSiteData.galleryColumns.find((c) => c.name.trim().toLowerCase() === targetName) ||
      currentSiteData.galleryColumns[0];
    if (!col) return;

    lastFocusedElement = triggerElement || document.activeElement;
    titleEl.textContent = col.name;
    const allItems = [...(col.media || []), ...(col.cycleMedia || [])];

    gridEl.innerHTML = allItems
      .map((m) => {
        const bg = sanitizeHexColor(m.color, '#e8e8e8');
        const isVid = m.type === 'video' || String(m.src || '').endsWith('.mp4');
        const safeSrc = escapeHtml(sanitizeUrl(m.src, '', true));
        const safePoster = escapeHtml(sanitizeUrl(m.poster, '', true));
        return `
        <div class="viv-lightbox__card" style="background-color:${bg}">
          ${
            isVid
              ? `<video src="${safeSrc}"${safePoster ? ` poster="${safePoster}"` : ''} autoplay muted loop playsinline></video>`
              : `<img src="${safeSrc}" alt="${escapeHtml(col.name)}" loading="lazy">`
          }
        </div>`;
      })
      .join('');

    lb.classList.add('is-open');
    lb.removeAttribute('aria-hidden');
    document.body.classList.add('is-lightbox-open');
    if (lenisInstance) lenisInstance.stop();
    if (closeBtn) closeBtn.focus();
  }
})();
