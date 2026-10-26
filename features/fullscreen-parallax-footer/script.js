(function () {
  const footer = document.getElementById('edvFooter');
  const links = document.querySelectorAll('.footer-link');
  const card = document.getElementById('floatingCard');
  const art = document.getElementById('floatingArt');
  const caption = document.getElementById('floatingCaption');

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

  let mouseX = window.innerWidth * 0.72;
  let mouseY = window.innerHeight * 0.48;
  let cardX = mouseX;
  let cardY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  links.forEach((link, idx) => {
    link.addEventListener('mouseenter', () => {
      const bg = link.getAttribute('data-bg');
      const city = link.getAttribute('data-city');
      footer.style.backgroundColor = bg;
      art.style.backgroundImage = `url('${STUDIO_IMAGES[idx % STUDIO_IMAGES.length]}')`;
      art.style.backgroundSize = 'cover';
      art.style.backgroundPosition = 'center';
      caption.textContent = city;
      card.classList.add('is-visible');
    });

    link.addEventListener('mouseleave', () => {
      footer.style.backgroundColor = '#141413';
    });

    link.addEventListener('click', (e) => e.preventDefault());
  });

  function animate() {
    cardX += (mouseX - cardX) * 0.12;
    cardY += (mouseY - cardY) * 0.12;
    const vx = (mouseX - cardX) * 0.08;
    card.style.transform = `translate3d(${cardX.toFixed(1)}px, ${cardY.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${vx.toFixed(2)}deg)`;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
