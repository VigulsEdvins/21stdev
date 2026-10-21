(function () {
  const shell = document.getElementById('navShell');
  const btn = document.getElementById('burgerBtn');
  const label = document.getElementById('burgerLabel');

  function toggleMenu() {
    const isOpen = shell.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', String(isOpen));
    label.textContent = isOpen ? 'CLOSE' : 'MENU';
  }

  btn.addEventListener('click', toggleMenu);
  document.querySelectorAll('.menu-links a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMenu();
    });
  });
})();
