(function () {
  const footer = document.getElementById('vivFooter');
  const links = document.querySelectorAll('.footer-link');
  const card = document.getElementById('floatingCard');
  const art = document.getElementById('floatingArt');
  const caption = document.getElementById('floatingCaption');

  let mouseX = window.innerWidth * 0.65;
  let mouseY = window.innerHeight * 0.5;
  let cardX = mouseX;
  let cardY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  links.forEach((link) => {
    link.addEventListener('mouseenter', () => {
      const bg = link.getAttribute('data-bg');
      const accent = link.getAttribute('data-accent');
      const city = link.getAttribute('data-city');
      footer.style.backgroundColor = bg;
      art.style.background = `radial-gradient(circle at 35% 30%, ${accent}, ${bg} 80%)`;
      caption.textContent = city;
      card.classList.add('is-visible');
    });

    link.addEventListener('mouseleave', () => {
      card.classList.remove('is-visible');
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
