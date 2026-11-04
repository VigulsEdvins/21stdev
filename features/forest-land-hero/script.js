(function () {
  const primaryBtn = document.querySelector('.flh-btn-primary');
  if (primaryBtn) {
    primaryBtn.addEventListener('click', (e) => {
      const target = document.querySelector(primaryBtn.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
})();
