(function () {
  // Everything is looked up inside this footer's own section, so the effect never touches the rest of the page
  const host = window.__activeSectionRegisteringId && document.getElementById(window.__activeSectionRegisteringId);
  const scope = host || document;
  const footer = scope.querySelector('#edvFooter');
  if (!footer) return;
  const links = footer.querySelectorAll('.footer-link');
  const card = footer.querySelector('#floatingCard');
  const art = footer.querySelector('#floatingArt');
  const caption = footer.querySelector('#floatingCaption');

  const STUDIO_IMAGES = [
    '/assets/library/edv-art-01.svg',
    '/assets/library/edv-art-05.svg',
    '/assets/library/edv-art-09.svg',
    '/assets/library/edv-art-13.svg'
  ];

  // Show default studio preview card immediately so preview is visually rich
  art.style.backgroundImage = `url('${STUDIO_IMAGES[0]}')`;
  art.style.backgroundSize = 'cover';
  art.style.backgroundPosition = 'center';
  card.classList.add('is-visible');

  // Positions are measured inside the footer; the card rests at a default spot when the pointer is elsewhere
  function restX() { return footer.clientWidth * 0.72; }
  function restY() { return footer.clientHeight * 0.45; }
  let mouseX = restX();
  let mouseY = restY();
  let cardX = mouseX;
  let cardY = mouseY;
  let visible = true;

  footer.addEventListener('mousemove', (e) => {
    const r = footer.getBoundingClientRect();
    mouseX = e.clientX - r.left;
    mouseY = e.clientY - r.top;
  });
  footer.addEventListener('mouseleave', () => {
    mouseX = restX();
    mouseY = restY();
  });

  links.forEach((link, idx) => {
    link.addEventListener('mouseenter', () => {
      const bg = link.getAttribute('data-bg');
      const city = link.getAttribute('data-city');
      footer.style.backgroundColor = 'color-mix(in srgb, ' + bg + ' 32%, var(--bg, #141413))';
      art.style.backgroundImage = `url('${STUDIO_IMAGES[idx % STUDIO_IMAGES.length]}')`;
      art.style.backgroundSize = 'cover';
      art.style.backgroundPosition = 'center';
      caption.textContent = city;
      card.classList.add('is-visible');
    });

    link.addEventListener('mouseleave', () => {
      footer.style.backgroundColor = '';
    });

    link.addEventListener('click', (e) => e.preventDefault());
  });

  function animate() {
    raf = 0;
    if (!visible) return;
    cardX += (mouseX - cardX) * 0.12;
    cardY += (mouseY - cardY) * 0.12;
    const vx = (mouseX - cardX) * 0.08;
    card.style.transform = `translate3d(${cardX.toFixed(1)}px, ${cardY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${vx.toFixed(2)}deg)`;
    raf = requestAnimationFrame(animate);
  }
  let raf = 0;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      visible = es[es.length - 1].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(animate);
    }).observe(footer);
  }
  raf = requestAnimationFrame(animate);
})();
