(function () {
  const footer = document.getElementById('vivFooter');
  const links = document.querySelectorAll('.footer-link');
  const card = document.getElementById('floatingCard');
  const art = document.getElementById('floatingArt');
  const caption = document.getElementById('floatingCaption');

  const STUDIO_IMAGES = [
    '/assets/library/1778793995-arturo-torres-fashion-photography-advertising-photographer-15-ba930551.jpg',
    '/assets/library/1778184121-danielle-moore-desert-couture-fashion-editorial-ead1d087.jpg',
    '/assets/library/1778795293-quinn-gravier-advertising-photographer-portraits-celebrity26-2e04fbf6.jpg',
    '/assets/library/1778184120-gap-studio-zac-posen-denim-portrait-ea9bd030.jpg'
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
