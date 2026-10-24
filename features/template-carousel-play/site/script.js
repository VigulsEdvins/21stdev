/**
 * Gallery Play — Main Application, Dynamic CMS Renderer & 3D Cylindrical Carousel Engine
 *
 * Implements:
 * 1. Dynamic Content Rendering & Live CMS Sync (window.GPStore)
 * 2. 3D Cylindrical Image Carousel (GSAP + ScrollTrigger + Observer)
 * 3. Mobile/Tablet Touch Slider & Mode Switcher (Touch Slider <-> 3D Cylinder)
 * 4. Lenis Smooth Scrolling synced with GSAP Ticker
 * 5. Interactive Cursor Image Trail (#main-container)
 * 6. Scroll-scrubbed Word Reveal & Rotating Pitch Geometry
 * 7. Accessible UI Controls (Menu, Athlete Tabs, FAQ Accordion, Contact Form)
 *
 * Note: Mouse-move thermal heat line (#heatmap-overlay) has been intentionally removed.
 */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let carouselCleanup = null;
  let trailCleanup = null;
  let scrollAnimCleanup = null;
  let currentAthleteFilter = 'all';
  let lastCarouselProjectsHash = '';

  const escapeHtml = (str) => window.GPStore.escapeHtml(str);
  const formatMultilineHtml = (str) => window.GPStore.formatMultilineHtml(str);
  const sanitizeUrl = (url, fallback, allowData) => window.GPStore.sanitizeUrl(url, fallback, allowData);
  const sanitizeCssUrl = (url) => window.GPStore.sanitizeCssUrl(url);

  document.addEventListener('DOMContentLoaded', () => {
    if (window.self !== window.top || new URLSearchParams(window.location.search).has('preview')) {
      document.body.classList.add('is-preview-iframe');
    }

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && typeof Observer !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger, Observer);
    }

    const initialData = window.GPStore ? window.GPStore.load() : window.GP_DEFAULT_DATA;
    if (initialData) {
      renderSiteContent(initialData);
    }

    initPageLoader();
    initSmoothScroll();
    initMapHeightSync();
    init3DCarousel();
    initMobileCarouselSwitcher();
    initImageTrail();
    initScrollAnimations();
    initCustomCursor();
    initUIInteractions();

    if (window.GPStore && typeof window.GPStore.onUpdate === 'function') {
      window.GPStore.onUpdate((updatedData) => {
        if (!updatedData) return;
        const carouselChanged = renderSiteContent(updatedData);
        if (carouselChanged) {
          init3DCarousel();
        }
        initImageTrail();
        initScrollAnimations();
        if (typeof ScrollTrigger !== 'undefined') {
          ScrollTrigger.refresh();
        }
      });
    }
  });

  /* ==========================================================================
     0. Dynamic Content Renderer (CMS Data -> DOM)
     ========================================================================== */
  function renderSiteContent(data) {
    if (!data) return false;
    let carouselChanged = false;

    // 1. Hero Section (#top, #hero-heading, #hero-subtitle, #hero-cta)
    if (data.hero) {
      const heroSec = document.getElementById('top');
      const heroHeading = document.getElementById('hero-heading');
      const heroSubtitle = document.getElementById('hero-subtitle');
      const heroCta = document.getElementById('hero-cta');

      if (heroSec && data.hero.bgImage) {
        heroSec.style.backgroundImage = `url('${sanitizeCssUrl(data.hero.bgImage)}')`;
      }
      if (heroHeading && data.hero.title) {
        heroHeading.innerHTML = formatMultilineHtml(data.hero.title);
      }
      if (heroSubtitle && data.hero.subtitle) {
        heroSubtitle.textContent = data.hero.subtitle;
      }
      if (heroCta) {
        if (data.hero.ctaText) heroCta.textContent = data.hero.ctaText;
        if (data.hero.ctaLink) heroCta.setAttribute('href', sanitizeUrl(data.hero.ctaLink, '#contact'));
      }
    }

    // 2. Clients Marquee (#clients-marquee with two .clients-marquee__group tracks)
    if (Array.isArray(data.clients)) {
      const marquee = document.getElementById('clients-marquee');
      if (marquee) {
        const buildGroup = (isClone) => `
          <div class="clients-marquee__group"${isClone ? ' aria-hidden="true"' : ''}>
            ${data.clients
              .map(
                (c) => `
              <div class="clients-marquee__item">
                <img src="${escapeHtml(sanitizeUrl(c.logo, '', true))}" alt="${isClone ? '' : escapeHtml(c.name)}" loading="lazy" decoding="async" />
              </div>`
              )
              .join('')}
          </div>`;
        marquee.innerHTML = buildGroup(false) + buildGroup(true);
      }
    }

    // 3. About Section (#about, #about-text, #about-cta-primary, #about-cta-secondary)
    if (data.about) {
      const aboutSec = document.getElementById('about');
      const aboutText = document.getElementById('about-text');
      const cta1 = document.getElementById('about-cta-primary');
      const cta2 = document.getElementById('about-cta-secondary');

      if (aboutSec && data.about.bgImage) {
        aboutSec.style.backgroundImage = `url('${sanitizeCssUrl(data.about.bgImage)}')`;
      }
      if (aboutText && data.about.text) {
        aboutText.setAttribute('data-raw-text', data.about.text);
        aboutText.textContent = data.about.text;
      }
      if (cta1) {
        if (data.about.ctaPrimaryText) cta1.textContent = data.about.ctaPrimaryText;
        if (data.about.ctaPrimaryLink) cta1.setAttribute('href', sanitizeUrl(data.about.ctaPrimaryLink, '#contact'));
      }
      if (cta2) {
        if (data.about.ctaSecondaryText) cta2.textContent = data.about.ctaSecondaryText;
        if (data.about.ctaSecondaryLink) cta2.setAttribute('href', sanitizeUrl(data.about.ctaSecondaryLink, '#work'));
      }
    }

    // 4. Projects Heading + 3D Cylindrical Carousel + Mobile Touch Slider
    if (data.projectsSection) {
      const workHeading = document.getElementById('work-heading');
      const footerText = document.getElementById('projects-footer-text');
      const projCta1 = document.getElementById('projects-cta-primary');
      const projCta2 = document.getElementById('projects-cta-secondary');
      if (workHeading && data.projectsSection.heading) {
        workHeading.innerHTML = formatMultilineHtml(data.projectsSection.heading);
      }
      if (footerText && data.projectsSection.footerText) {
        footerText.textContent = data.projectsSection.footerText;
      }
      if (projCta1) {
        if (data.projectsSection.ctaPrimaryText) projCta1.textContent = data.projectsSection.ctaPrimaryText;
        if (data.projectsSection.ctaPrimaryLink) projCta1.setAttribute('href', sanitizeUrl(data.projectsSection.ctaPrimaryLink, '#contact'));
      }
      if (projCta2) {
        if (data.projectsSection.ctaSecondaryText) projCta2.textContent = data.projectsSection.ctaSecondaryText;
        if (data.projectsSection.ctaSecondaryLink) projCta2.setAttribute('href', sanitizeUrl(data.projectsSection.ctaSecondaryLink, '#services'));
      }
    }

    const projectsList = Array.isArray(data.carouselProjects) ? data.carouselProjects : [];
    if (projectsList.length > 0) {
      const nextHash = JSON.stringify(projectsList);
      if (nextHash !== lastCarouselProjectsHash) {
        lastCarouselProjectsHash = nextHash;
        carouselChanged = true;
        renderCarouselAndMobileProjects(projectsList);
      }
    }

    // 5. Services Section (#services-heading, #services-subtitle, #services-cards-container)
    const srvData = data.servicesSection;
    if (srvData) {
      const srvHeading = document.getElementById('services-heading');
      const srvSub = document.getElementById('services-subtitle');
      const srvCta = document.getElementById('services-cta');
      if (srvHeading && srvData.heading) {
        srvHeading.innerHTML = formatMultilineHtml(srvData.heading);
      }
      if (srvSub && srvData.subtitle) {
        srvSub.textContent = srvData.subtitle;
      }
      if (srvCta) {
        if (srvData.ctaText) srvCta.textContent = srvData.ctaText;
        if (srvData.ctaLink) srvCta.setAttribute('href', sanitizeUrl(srvData.ctaLink, '#contact'));
      }

      const srvContainer = document.getElementById('services-cards-container');
      if (srvContainer && Array.isArray(srvData.cards)) {
        srvContainer.innerHTML = srvData.cards
          .map((card) => {
            const bullets = Array.isArray(card.bullets)
              ? card.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
              : '';
            const descHtml = card.description ? `<p>${escapeHtml(card.description)}</p>` : '';
            return `
            <article class="services-card" tabindex="0" style="background-image: url('${escapeHtml(sanitizeCssUrl(card.image))}');">
              <div class="services-card-overlay">
                <h3 class="services-card-overlay-title">${escapeHtml(card.title)}</h3>
              </div>
              <div class="services-card-content">
                <div class="services-card-content-text">
                  ${descHtml}
                  <ul>${bullets}</ul>
                </div>
              </div>
            </article>`;
          })
          .join('');
      }
    }

    // 6. Athletes Section (#athletes-heading, #tab-all-athletes, #tab-exclusive-athletes, #athletes-rail)
    const athData = data.athletesSection;
    if (athData) {
      const athHeading = document.getElementById('athletes-heading');
      const tabAll = document.getElementById('tab-all-athletes');
      const tabExcl = document.getElementById('tab-exclusive-athletes');
      if (athHeading && athData.heading) athHeading.innerHTML = formatMultilineHtml(athData.heading);
      if (tabAll && athData.tabAllLabel) tabAll.textContent = athData.tabAllLabel;
      if (tabExcl && athData.tabExclusiveLabel) tabExcl.textContent = athData.tabExclusiveLabel;

      const athletesRail = document.getElementById('athletes-rail');
      const athleteList = athData.athletes || [];
      if (athletesRail && Array.isArray(athleteList)) {
        athletesRail.innerHTML = athleteList
          .map((ath) => {
            const cat = ath.category === 'exclusive' ? 'exclusive' : 'all';
            const hidden = currentAthleteFilter !== 'all' && cat !== currentAthleteFilter ? ' style="display:none;"' : '';
            return `
            <article class="portrait-card athlete-card" data-category="${escapeHtml(cat)}"${hidden}>
              <div class="portrait-card__media" style="background-image: url('${escapeHtml(sanitizeCssUrl(ath.image))}');" role="img" aria-label="${escapeHtml(ath.name)}">
                <a href="#contact" class="portrait-card__overlay" aria-label="Collaborate with ${escapeHtml(ath.name)}">
                  <div class="portrait-card__overlay-top">
                    <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="#ffffff" stroke-width="1.6" fill="none"/></svg>
                  </div>
                  <div class="portrait-card__overlay-center">GET IN TOUCH</div>
                  <div></div>
                </a>
              </div>
              <div>
                <h3 class="portrait-card__name">${escapeHtml(ath.name)}</h3>
                ${ath.role ? `<p class="portrait-card__role">${escapeHtml(ath.role)}</p>` : ''}
              </div>
            </article>`;
          })
          .join('');
        setupHorizontalDots('athletes-rail', 'athletes-dots', '.portrait-card', true);
      }
    }

    // 7. Cursor Image Trail Section (#image-trail-text, #image-trail-pool)
    const trailData = data.trailSection;
    if (trailData) {
      const trailTextEl = document.getElementById('image-trail-text');
      const trailCta1 = document.getElementById('trail-cta-primary');
      const trailCta2 = document.getElementById('trail-cta-secondary');
      if (trailTextEl && trailData.heading) {
        trailTextEl.setAttribute('data-raw-text', trailData.heading);
        trailTextEl.textContent = trailData.heading;
      }
      if (trailCta1) {
        if (trailData.ctaPrimaryText) trailCta1.textContent = trailData.ctaPrimaryText;
        if (trailData.ctaPrimaryLink) trailCta1.setAttribute('href', sanitizeUrl(trailData.ctaPrimaryLink, '#contact'));
      }
      if (trailCta2) {
        if (trailData.ctaSecondaryText) trailCta2.textContent = trailData.ctaSecondaryText;
        if (trailData.ctaSecondaryLink) trailCta2.setAttribute('href', sanitizeUrl(trailData.ctaSecondaryLink, '#faq'));
      }
      const trailPool = document.getElementById('image-trail-pool');
      if (trailPool && Array.isArray(trailData.images)) {
        trailPool.innerHTML = trailData.images
          .map(
            (src) =>
              `<img class="image-trail" src="${escapeHtml(sanitizeUrl(src, '', true))}" alt="" loading="lazy" decoding="async" />`
          )
          .join('');
      }
    }

    // 8. Team Section (#team-heading, #team-rail)
    const teamData = data.teamSection;
    if (teamData) {
      const teamHeading = document.getElementById('team-heading');
      if (teamHeading && teamData.heading) {
        teamHeading.innerHTML = formatMultilineHtml(teamData.heading);
      }
      const teamRail = document.getElementById('team-rail');
      if (teamRail && Array.isArray(teamData.members)) {
        const svgDefs = `
          <svg width="0" height="0" style="position:absolute;width:0;height:0;pointer-events:none;overflow:hidden;" aria-hidden="true">
            <defs>
              <linearGradient id="gp-heat-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#213ded" />
                <stop offset="25%" stop-color="#00acd7" />
                <stop offset="50%" stop-color="#00b181" />
                <stop offset="75%" stop-color="#e6c82a" />
                <stop offset="100%" stop-color="#ff3700" />
              </linearGradient>
            </defs>
          </svg>`;

        const cardsHtml = teamData.members
          .map((m) => {
            const safeEmailHref = m.email ? sanitizeUrl(`mailto:${m.email}`, '#contact') : '#contact';
            const safeTelHref = m.phone ? sanitizeUrl(`tel:${m.phone.replace(/\s+/g, '')}`, '#contact') : '';
            return `
          <article class="portrait-card team-card">
            <div class="portrait-card__media" style="background-image: url('${escapeHtml(sanitizeCssUrl(m.image))}');" role="img" aria-label="${escapeHtml(m.name)}">
              <a href="${escapeHtml(safeEmailHref)}" class="portrait-card__overlay" aria-label="Contact ${escapeHtml(m.name)}">
                <div class="portrait-card__overlay-top">
                  <svg width="16" height="16" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="#ffffff" stroke-width="1.6" fill="none"/></svg>
                </div>
                <div class="portrait-card__overlay-center">GET IN TOUCH</div>
                <div></div>
              </a>
            </div>
            <div>
              <p class="portrait-card__role">${escapeHtml(m.role || '')}</p>
              <h3 class="portrait-card__name">${escapeHtml(m.name)}</h3>
              <div class="team-card__contacts">
                ${
                  m.email
                    ? `<a href="${escapeHtml(safeEmailHref)}" class="team-contact-link">
                        <svg class="team-contact-icon" width="16" height="16" viewBox="0 0 512 512" aria-hidden="true"><path fill="url(#gp-heat-grad)" d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>
                        <span>${escapeHtml(m.email)}</span>
                      </a>`
                    : ''
                }
                ${
                  m.phone
                    ? `<a href="${escapeHtml(safeTelHref)}" class="team-contact-link">
                        <svg class="team-contact-icon" width="16" height="16" viewBox="0 0 512 512" aria-hidden="true"><path fill="url(#gp-heat-grad)" d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>
                        <span>${escapeHtml(m.phone)}</span>
                      </a>`
                    : ''
                }
              </div>
            </div>
          </article>`;
          })
          .join('');

        teamRail.innerHTML = svgDefs + cardsHtml;
      }
    }

    // 9. Ready-to-Play CTA Section (#ready-image, #ready-heading, #ready-cta)
    const readyData = data.readySection;
    if (readyData) {
      const readyImg = document.getElementById('ready-image');
      const readyHeading = document.getElementById('ready-heading');
      const readyBtn = document.getElementById('ready-cta');
      if (readyImg && readyData.image) {
        readyImg.style.backgroundImage = `url('${sanitizeCssUrl(readyData.image)}')`;
      }
      if (readyHeading && readyData.heading) {
        readyHeading.innerHTML = formatMultilineHtml(readyData.heading);
      }
      if (readyBtn) {
        if (readyData.ctaText) readyBtn.textContent = readyData.ctaText;
        if (readyData.ctaLink) readyBtn.setAttribute('href', sanitizeUrl(readyData.ctaLink, '#contact'));
      }
    }

    // 10. Contact Section (#contact-heading, #contact-submit-btn)
    const contactData = data.contactSection;
    if (contactData) {
      const contactHeading = document.getElementById('contact-heading');
      const submitBtn = document.getElementById('contact-submit-btn');
      if (contactHeading && contactData.heading) {
        contactHeading.innerHTML = formatMultilineHtml(contactData.heading);
      }
      if (submitBtn && contactData.submitText) {
        submitBtn.textContent = contactData.submitText;
      }
    }

    // 11. FAQ Section (#faq-heading, #faq-accordion)
    const faqData = data.faqSection;
    if (faqData) {
      const faqHeading = document.getElementById('faq-heading');
      if (faqHeading && faqData.heading) {
        faqHeading.innerHTML = formatMultilineHtml(faqData.heading);
      }
      const faqAcc = document.getElementById('faq-accordion');
      if (faqAcc && Array.isArray(faqData.items)) {
        faqAcc.innerHTML = faqData.items
          .map((item, idx) => {
            const isFirst = idx === 0;
            const paragraphs = String(item.answer || '')
              .split(/\n\n+/)
              .map((p) => `<p>${escapeHtml(p)}</p>`)
              .join('');
            return `
            <div class="faq-item">
              <h3>
                <button class="faq-trigger" type="button" aria-expanded="${isFirst ? 'true' : 'false'}" aria-controls="faq-panel-${idx + 1}" id="faq-btn-${idx + 1}">
                  <span>${escapeHtml(item.question)}</span>
                  <svg class="faq-trigger__icon" viewBox="0 0 448 512" aria-hidden="true">
                    <path fill="currentColor" d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
                  </svg>
                </button>
              </h3>
              <div id="faq-panel-${idx + 1}" class="faq-panel${isFirst ? ' is-open' : ''}" role="region" aria-labelledby="faq-btn-${idx + 1}">
                ${paragraphs}
              </div>
            </div>`;
          })
          .join('');
        bindFaqTriggers();
      }
    }

    return carouselChanged;
  }

  /**
   * Builds both:
   * - The 12-panel (or N-panel) 3D cylinder `#carousel-3d-list` (alternating 2 items on odd panels, 1 item on even panels)
   * - The horizontal touch slider `#projects-mobile-track` + pagination dots `#projects-mobile-dots` for mobile & tablet
   */
  function renderCarouselAndMobileProjects(projects) {
    const listEl = document.getElementById('carousel-3d-list');
    const mobileTrack = document.getElementById('projects-mobile-track');

    const renderProjectCardInner = (proj) => {
      const safeLink = sanitizeUrl(proj.link || '#contact', '#contact');
      const safeImg = sanitizeCssUrl(proj.image);
      return `
      <div class="project-listing" style="background-image: url('${escapeHtml(safeImg)}');" role="img" aria-label="${escapeHtml(proj.alt || proj.title)}">
        <div class="project-listing__title-wrap">
          <h3 class="project-listing__title">${escapeHtml(proj.title)}</h3>
        </div>
        <a href="${escapeHtml(safeLink)}" class="project-listing-overlay" aria-label="Learn more about ${escapeHtml(proj.title)}" draggable="false">
          <div class="project-listing-overlay__top">
            <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M1 11L11 1M11 1H3M11 1V9" stroke="#ffffff" stroke-width="1.6" fill="none"/></svg>
          </div>
          <div class="project-listing-overlay__center">
            <span class="project-listing-overlay__label">${escapeHtml(proj.ctaLabel || 'LEARN MORE')}</span>
          </div>
          <div class="project-listing-overlay__bottom"></div>
        </a>
      </div>`;
    };

    if (listEl) {
      const panelsData = [];
      let cursor = 0;
      let panelIdx = 0;
      while (cursor < projects.length) {
        const takeCount = panelIdx % 2 === 0 ? 2 : 1;
        panelsData.push(projects.slice(cursor, cursor + takeCount));
        cursor += takeCount;
        panelIdx++;
      }

      listEl.innerHTML = panelsData
        .map((panelItems) => {
          const itemsHtml = panelItems
            .map(
              (proj) => `
            <div class="img-carousel__item" tabindex="0" data-project-id="${escapeHtml(proj.id)}">
              ${renderProjectCardInner(proj)}
            </div>`
            )
            .join('');
          return `<div class="img-carousel__panel">${itemsHtml}</div>`;
        })
        .join('');
    }

    if (mobileTrack) {
      mobileTrack.innerHTML = projects
        .map(
          (proj) => `
        <article class="projects-mobile-card" data-project-id="${escapeHtml(proj.id)}">
          ${renderProjectCardInner(proj)}
        </article>`
        )
        .join('');

      setupHorizontalDots('projects-mobile-track', 'projects-mobile-dots', '.projects-mobile-card', true);
    }
  }

  /**
   * Generates interactive pagination dots synced with horizontal scroll snap tracks
   */
  function setupHorizontalDots(trackId, dotsId, cardSelector, isDarkBg) {
    const track = document.getElementById(trackId);
    const dotsContainer = document.getElementById(dotsId);
    if (!track || !dotsContainer) return;

    if (isDarkBg) {
      dotsContainer.classList.add('slider-dots--light');
    }

    const getVisibleCards = () =>
      Array.from(track.querySelectorAll(cardSelector)).filter((el) => el.style.display !== 'none');

    const renderDots = () => {
      const cards = getVisibleCards();
      if (cards.length <= 1) {
        dotsContainer.innerHTML = '';
        return;
      }

      dotsContainer.innerHTML = cards
        .map(
          (_, idx) =>
            `<button type="button" class="slider-dot${idx === 0 ? ' is-active' : ''}" aria-label="Go to slide ${idx + 1}" data-slide-idx="${idx}"></button>`
        )
        .join('');

      dotsContainer.querySelectorAll('.slider-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          const idx = Number(dot.getAttribute('data-slide-idx'));
          const targetCard = getVisibleCards()[idx];
          if (targetCard) {
            const left = targetCard.offsetLeft - (track.clientWidth - targetCard.clientWidth) / 2;
            track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
          }
        });
      });
    };

    renderDots();

    const updateActiveDot = () => {
      const cards = getVisibleCards();
      const dots = dotsContainer.querySelectorAll('.slider-dot');
      if (cards.length === 0 || dots.length === 0) return;

      const trackCenter = track.scrollLeft + track.clientWidth / 2;
      let closestIdx = 0;
      let minDelta = Infinity;
      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const delta = Math.abs(cardCenter - trackCenter);
        if (delta < minDelta) {
          minDelta = delta;
          closestIdx = idx;
        }
      });

      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === closestIdx));
    };

    if (track._dotsScrollHandler) {
      track.removeEventListener('scroll', track._dotsScrollHandler);
    }
    track._dotsScrollHandler = updateActiveDot;
    track.addEventListener('scroll', updateActiveDot, { passive: true });
  }

  /* ==========================================================================
     1. Page Loader
     ========================================================================== */
  function initPageLoader() {
    const loader = document.getElementById('page-loader');
    if (!loader) return;

    const hideLoader = () => {
      loader.classList.add('is-loaded');
    };

    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 200);
    } else {
      window.addEventListener('load', () => setTimeout(hideLoader, 200), { once: true });
      setTimeout(hideLoader, 1000);
    }
  }

  /* ==========================================================================
     2. Lenis Smooth Scroll + GSAP ScrollTrigger Sync
     ========================================================================== */
  function initSmoothScroll() {
    if (prefersReducedMotion || typeof Lenis === 'undefined' || typeof gsap === 'undefined') {
      return;
    }

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          lenis.scrollTo(targetEl, { offset: 0, duration: 1.2 });
        }
      });
    });
  }

  /* ==========================================================================
     3. Sync Europe Map Background (#target) with Projects Container (#reference)
     ========================================================================== */
  function initMapHeightSync() {
    const ref = document.getElementById('reference');
    const target = document.getElementById('target');
    if (!ref || !target) return;

    const syncHeights = () => {
      const refHeight = ref.getBoundingClientRect().height;
      target.style.height = `${refHeight}px`;
    };

    syncHeights();
    window.addEventListener('resize', syncHeights, { passive: true });
  }

  /* ==========================================================================
     4. 3D Cylindrical Image Carousel (With Scroll Velocity & Drag-to-Spin)
     ========================================================================== */
  function init3DCarousel() {
    if (typeof carouselCleanup === 'function') {
      carouselCleanup();
      carouselCleanup = null;
    }

    if (typeof gsap === 'undefined') return;

    const wrapEl = document.getElementById('carousel-3d-wrap');
    const listEl = document.querySelector('.img-carousel__list');
    const panels = gsap.utils.toArray('.img-carousel__panel');
    const items = gsap.utils.toArray('.img-carousel__item');

    if (!listEl || panels.length === 0) return;

    const calcRadius = () => window.innerWidth * 0.5;

    const setPanelOrigins = (radius) => {
      panels.forEach((panel) => {
        panel.style.transformOrigin = `50% 50% ${-radius}px`;
      });
    };

    gsap.set(listEl, { clearProps: 'transform' });
    panels.forEach((p) => gsap.set(p, { clearProps: 'transform,transformOrigin' }));

    // Tilt the entire 3D cylinder container by 5 degrees on the Z-axis
    gsap.set(listEl, { rotation: 5 });

    // IMPORTANT: Initialize GSAP rotationY timeline BEFORE setting inline 3D transformOrigin
    // so GSAP's CSSPlugin does not bake a compensating translate3d() offset into each panel.
    const spinTl = gsap.timeline({
      repeat: -1,
      paused: prefersReducedMotion,
    });

    spinTl.fromTo(
      panels,
      {
        rotationY: (i) => (i * 360) / panels.length,
      },
      {
        rotationY: '-=360',
        duration: 95,
        ease: 'none',
      }
    );

    spinTl.progress(1000);

    let radius = calcRadius();
    setPanelOrigins(radius);

    let currentDirection = 1;
    let isManuallyPaused = false;
    let isPointerDown = false;
    let hasDragged = false;
    let suppressNextClick = false;
    let dragStartX = 0;
    let lastDragX = 0;
    let lastDragTime = 0;
    let dragVelocityX = 0;

    let velocityObserver = null;
    if (!prefersReducedMotion && typeof Observer !== 'undefined') {
      velocityObserver = Observer.create({
        target: window,
        type: 'wheel',
        onChangeY(self) {
          if (isManuallyPaused || isPointerDown) return;

          const v = gsap.utils.clamp(-6, 6, self.velocityY * 0.0012);
          if (Math.abs(v) < 0.08) return;

          currentDirection = v < 0 ? -1 : 1;

          gsap.to(spinTl, {
            timeScale: v,
            duration: 0.25,
            ease: 'power2.out',
            overwrite: true,
          });

          gsap.to(spinTl, {
            timeScale: currentDirection,
            duration: 1.4,
            ease: 'power3.out',
            delay: 0.08,
          });
        },
      });
    }

    // Horizontal Drag-to-Spin with Smooth 1:1 Tracking & Gentle Inertia
    const onPointerDown = (e) => {
      if (e.button && e.button !== 0) return;
      isPointerDown = true;
      hasDragged = false;
      dragStartX = e.clientX;
      lastDragX = e.clientX;
      lastDragTime = performance.now();
      dragVelocityX = 0;
    };

    const onPointerMove = (e) => {
      if (!isPointerDown) return;
      const dx = e.clientX - lastDragX;
      const totalDx = Math.abs(e.clientX - dragStartX);

      if (!hasDragged && totalDx > 6) {
        hasDragged = true;
        if (wrapEl) wrapEl.classList.add('is-dragging');
        gsap.killTweensOf(spinTl);
        spinTl.timeScale(0);
      }

      if (hasDragged) {
        const now = performance.now();
        const dt = Math.max(12, now - lastDragTime);
        const instantVel = dx / dt;
        // Exponential moving average to smooth out pointer jitter
        dragVelocityX = dragVelocityX * 0.65 + instantVel * 0.35;
        lastDragX = e.clientX;
        lastDragTime = now;

        if (Math.abs(dx) > 1) {
          currentDirection = dx > 0 ? -1 : 1;
        }

        // Convert horizontal pixel delta to natural cylinder surface angle
        const spinDuration = spinTl.duration() || 95;
        const degPerPx = 110 / Math.max(700, window.innerWidth);
        const timeDelta = (dx * degPerPx / 360) * spinDuration;
        const nextTime = Math.max(600, spinTl.totalTime() - timeDelta);
        spinTl.totalTime(nextTime);
      }
    };

    const onPointerUp = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      if (wrapEl) wrapEl.classList.remove('is-dragging');

      if (hasDragged) {
        suppressNextClick = true;
        setTimeout(() => {
          suppressNextClick = false;
        }, 120);

        const staleDrag = performance.now() - lastDragTime > 80;
        const throwScale = staleDrag ? 0 : gsap.utils.clamp(-5.5, 5.5, -dragVelocityX * 3.8);
        if (!prefersReducedMotion) {
          spinTl.play();
          gsap.to(spinTl, {
            timeScale: Math.abs(throwScale) > 1.1 ? throwScale : isManuallyPaused ? 0 : currentDirection,
            duration: 0.2,
            ease: 'power2.out',
            overwrite: true,
          });
          gsap.to(spinTl, {
            timeScale: isManuallyPaused ? 0 : currentDirection,
            duration: 1.25,
            ease: 'power3.out',
            delay: 0.08,
          });
        }
      }
      hasDragged = false;
    };

    const onClickCapture = (e) => {
      if (suppressNextClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = false;
      }
    };

    if (wrapEl) {
      wrapEl.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      wrapEl.addEventListener('click', onClickCapture, true);
    }

    const viewportTrigger =
      typeof ScrollTrigger !== 'undefined'
        ? ScrollTrigger.create({
            trigger: listEl,
            start: 'top 95%',
            end: 'bottom 5%',
            onEnter: () => {
              if (!isManuallyPaused && !prefersReducedMotion) spinTl.play();
              if (velocityObserver) velocityObserver.enable();
            },
            onEnterBack: () => {
              if (!isManuallyPaused && !prefersReducedMotion) spinTl.play();
              if (velocityObserver) velocityObserver.enable();
            },
            onLeave: () => {
              spinTl.pause();
              if (velocityObserver) velocityObserver.disable();
            },
            onLeaveBack: () => {
              spinTl.pause();
              if (velocityObserver) velocityObserver.disable();
            },
          })
        : null;

    const itemCleanups = items.map((item) => {
      const pauseSpin = () => {
        if (isManuallyPaused || isPointerDown) return;
        gsap.to(spinTl, {
          timeScale: 0,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: true,
        });
      };

      const resumeSpin = () => {
        if (isManuallyPaused || isPointerDown) return;
        gsap.to(spinTl, {
          timeScale: currentDirection,
          duration: 0.8,
          ease: 'power2.inOut',
          overwrite: true,
        });
      };

      item.addEventListener('mouseenter', pauseSpin);
      item.addEventListener('mouseleave', resumeSpin);
      item.addEventListener('focusin', pauseSpin);
      item.addEventListener('focusout', resumeSpin);

      return () => {
        item.removeEventListener('mouseenter', pauseSpin);
        item.removeEventListener('mouseleave', resumeSpin);
        item.removeEventListener('focusin', pauseSpin);
        item.removeEventListener('focusout', resumeSpin);
      };
    });

    const prevBtn = document.getElementById('carousel-prev');
    const toggleBtn = document.getElementById('carousel-toggle');
    const nextBtn = document.getElementById('carousel-next');

    const onPrev = () => {
      currentDirection = -1;
      if (isManuallyPaused) {
        isManuallyPaused = false;
        spinTl.play();
        if (toggleBtn) {
          toggleBtn.textContent = 'Pause';
          toggleBtn.setAttribute('aria-pressed', 'false');
        }
      }
      gsap.to(spinTl, { timeScale: -5.5, duration: 0.22, ease: 'power2.out', overwrite: true });
      gsap.to(spinTl, { timeScale: -1, duration: 0.9, ease: 'power3.out', delay: 0.16 });
    };

    const onNext = () => {
      currentDirection = 1;
      if (isManuallyPaused) {
        isManuallyPaused = false;
        spinTl.play();
        if (toggleBtn) {
          toggleBtn.textContent = 'Pause';
          toggleBtn.setAttribute('aria-pressed', 'false');
        }
      }
      gsap.to(spinTl, { timeScale: 5.5, duration: 0.22, ease: 'power2.out', overwrite: true });
      gsap.to(spinTl, { timeScale: 1, duration: 0.9, ease: 'power3.out', delay: 0.16 });
    };

    const onToggle = () => {
      isManuallyPaused = !isManuallyPaused;
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-pressed', String(isManuallyPaused));
        toggleBtn.textContent = isManuallyPaused ? 'Resume' : 'Pause';
      }

      if (isManuallyPaused) {
        gsap.to(spinTl, {
          timeScale: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: true,
        });
      } else {
        spinTl.play();
        gsap.to(spinTl, {
          timeScale: currentDirection,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: true,
        });
      }
    };

    if (prevBtn) prevBtn.addEventListener('click', onPrev);
    if (nextBtn) nextBtn.addEventListener('click', onNext);
    if (toggleBtn) toggleBtn.addEventListener('click', onToggle);

    let resizeRaf = null;
    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        radius = calcRadius();
        setPanelOrigins(radius);
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      });
    };

    window.addEventListener('resize', onResize, { passive: true });

    carouselCleanup = () => {
      spinTl.kill();
      if (velocityObserver) velocityObserver.kill();
      if (viewportTrigger) viewportTrigger.kill();
      itemCleanups.forEach((fn) => fn());
      if (wrapEl) {
        wrapEl.removeEventListener('pointerdown', onPointerDown);
        wrapEl.removeEventListener('click', onClickCapture, true);
        wrapEl.classList.remove('is-dragging');
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      if (prevBtn) prevBtn.removeEventListener('click', onPrev);
      if (nextBtn) nextBtn.removeEventListener('click', onNext);
      if (toggleBtn) toggleBtn.removeEventListener('click', onToggle);
      window.removeEventListener('resize', onResize);
    };
  }

  /* ==========================================================================
     5. Mobile / Tablet Carousel Mode Switcher (Touch Slider <-> 3D Cylinder)
     ========================================================================== */
  function initMobileCarouselSwitcher() {
    const section = document.getElementById('work');
    const btnSlider = document.getElementById('mobile-mode-slider');
    const btn3d = document.getElementById('mobile-mode-3d');
    if (!section || !btnSlider || !btn3d) return;

    btnSlider.addEventListener('click', () => {
      section.classList.remove('force-3d-mobile');
      btnSlider.classList.add('is-active-mode', 'is-active');
      btnSlider.setAttribute('aria-pressed', 'true');
      btn3d.classList.remove('is-active-mode', 'is-active');
      btn3d.setAttribute('aria-pressed', 'false');
    });

    btn3d.addEventListener('click', () => {
      section.classList.add('force-3d-mobile');
      btn3d.classList.add('is-active-mode', 'is-active');
      btn3d.setAttribute('aria-pressed', 'true');
      btnSlider.classList.remove('is-active-mode', 'is-active');
      btnSlider.setAttribute('aria-pressed', 'false');
      init3DCarousel();
    });
  }

  /* ==========================================================================
     6. Interactive Cursor Image Trail (#main-container)
     ========================================================================== */
  function initImageTrail() {
    if (typeof trailCleanup === 'function') {
      trailCleanup();
      trailCleanup = null;
    }

    const container = document.getElementById('main-container');
    if (!container || typeof gsap === 'undefined' || prefersReducedMotion) return;

    const images = Array.from(container.querySelectorAll('.image-trail'));
    if (images.length === 0) return;

    let currentIndex = 0;
    let zCounter = 1;
    let lastPos = null;
    let isInside = false;
    const minDistance = 95;

    const getLocalCoords = (e) => {
      const rect = container.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const spawnTrailImage = (x, y, dx, dy) => {
      const img = images[currentIndex];
      currentIndex = (currentIndex + 1) % images.length;

      const offsetX = img.offsetWidth / 2 || 120;
      const offsetY = img.offsetHeight / 2 || 90;
      const driftFactor = 0.6;

      gsap.killTweensOf(img);

      gsap.set(img, {
        x: x - offsetX,
        y: y - offsetY,
        scale: 0.9,
        opacity: 1,
        rotation: gsap.utils.random(-8, 8),
        zIndex: zCounter++,
        force3D: true,
      });

      gsap.to(img, {
        x: x - offsetX + dx * driftFactor,
        y: y - offsetY + dy * driftFactor,
        scale: 1,
        duration: 0.55,
        ease: 'power2.out',
      });

      gsap.to(img, {
        scale: 0.4,
        opacity: 0,
        duration: 0.55,
        delay: 0.45,
        ease: 'power2.in',
      });
    };

    const onEnter = (e) => {
      isInside = true;
      lastPos = getLocalCoords(e);
    };

    const onLeave = () => {
      isInside = false;
      lastPos = null;
    };

    const onMove = (e) => {
      if (!isInside) return;
      const pos = getLocalCoords(e);
      if (!lastPos) {
        lastPos = pos;
        return;
      }
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      const dist = Math.hypot(dx, dy);

      if (dist >= minDistance) {
        spawnTrailImage(pos.x, pos.y, dx, dy);
        lastPos = pos;
      }
    };

    container.addEventListener('pointerenter', onEnter);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('pointermove', onMove, { passive: true });

    trailCleanup = () => {
      container.removeEventListener('pointerenter', onEnter);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('pointermove', onMove);
    };
  }

  /* ==========================================================================
     7. Scroll-Scrubbed Text Reveals & Pitch Circle Geometry
     ========================================================================== */
  function initScrollAnimations() {
    if (typeof scrollAnimCleanup === 'function') {
      scrollAnimCleanup();
      scrollAnimCleanup = null;
    }

    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || prefersReducedMotion) {
      return;
    }

    const activeTweens = [];

    document.querySelectorAll('[data-scroll-reveal]').forEach((el) => {
      const rawText = (el.getAttribute('data-raw-text') || el.textContent || '').trim();
      if (!rawText) return;
      el.setAttribute('data-raw-text', rawText);
      const words = rawText.split(/\s+/);
      el.innerHTML = words
        .map((w) => `<span class="reveal-word" style="opacity: 0.28; transition: opacity 0.1s;">${escapeHtml(w)}</span>`)
        .join(' ');

      const wordSpans = el.querySelectorAll('.reveal-word');
      const tween = gsap.fromTo(
        wordSpans,
        { opacity: 0.25 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 82%',
            end: 'bottom 45%',
            scrub: true,
          },
        }
      );
      activeTweens.push(tween);
    });

    gsap.utils.toArray('.track-bg-circle').forEach((circle) => {
      const tween = gsap.fromTo(
        circle,
        { rotation: -180 },
        {
          rotation: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: circle.closest('.culture-platform-wrapper, .contact-section') || circle,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
      activeTweens.push(tween);
    });

    scrollAnimCleanup = () => {
      activeTweens.forEach((t) => {
        if (t.scrollTrigger) t.scrollTrigger.kill();
        t.kill();
      });
    };
  }

  /* ==========================================================================
     8. Custom Glassmorphic Cursor (Ready to Play CTA Section)
     ========================================================================== */
  function initCustomCursor() {
    const cursor = document.getElementById('custom-cursor');
    const zones = document.querySelectorAll('[data-cursor-zone]');
    if (!cursor || zones.length === 0 || prefersReducedMotion) return;

    window.addEventListener(
      'pointermove',
      (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      },
      { passive: true }
    );

    zones.forEach((zone) => {
      zone.addEventListener('pointerenter', () => cursor.classList.add('is-active'));
      zone.addEventListener('pointerleave', () => cursor.classList.remove('is-active'));
    });
  }

  /* ==========================================================================
     9. Accessible UI Interactions (Menu, Athlete Tabs, FAQ, Contact Form)
     ========================================================================== */
  function bindFaqTriggers() {
    const faqTriggers = document.querySelectorAll('.faq-trigger');
    faqTriggers.forEach((trigger) => {
      trigger.onclick = () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        const panelId = trigger.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;

        trigger.setAttribute('aria-expanded', String(!isExpanded));
        if (panel) {
          panel.classList.toggle('is-open', !isExpanded);
        }
      };
    });
  }

  function initUIInteractions() {
    // 9A: Header Menu Dropdown
    const menuDropdown = document.querySelector('.menu-dropdown');
    const menuBtn = document.querySelector('.menu-open');

    if (menuDropdown && menuBtn) {
      menuBtn.addEventListener('click', () => {
        const isOpen = menuDropdown.classList.toggle('is-open');
        menuBtn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuDropdown.classList.contains('is-open')) {
          menuDropdown.classList.remove('is-open');
          menuBtn.setAttribute('aria-expanded', 'false');
          menuBtn.focus();
        }
      });

      menuDropdown.querySelectorAll('.menu-button').forEach((link) => {
        link.addEventListener('click', () => {
          menuDropdown.classList.remove('is-open');
          menuBtn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // 9B: Athletes Category Filter Tabs
    const tabButtons = document.querySelectorAll('.athletes-tab-btn');
    const athletePanel = document.getElementById('panel-athletes');

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter') || 'all';
        currentAthleteFilter = filter;

        tabButtons.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
        if (athletePanel) {
          athletePanel.setAttribute('aria-labelledby', btn.id);
        }

        const athleteCards = document.querySelectorAll('#panel-athletes .portrait-card');
        athleteCards.forEach((card) => {
          const category = card.getAttribute('data-category');
          const matches = filter === 'all' || category === filter;
          card.style.display = matches ? '' : 'none';
        });

        setupHorizontalDots('athletes-rail', 'athletes-dots', '.portrait-card', true);
      });
    });

    // 9C: FAQ Accordion
    bindFaqTriggers();

    // 9D: Contact Form Submission Handler
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm && formStatus) {
      contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!contactForm.checkValidity()) {
          formStatus.style.color = '#ff3700';
          formStatus.textContent = 'Please fill in all required fields before sending.';
          return;
        }
        formStatus.style.color = '#00b181';
        formStatus.textContent = 'Thank you! Your message has been received — we will get back to you shortly.';
        contactForm.reset();
      });
    }
  }
})();
