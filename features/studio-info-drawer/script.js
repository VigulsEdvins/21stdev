/**
 * Studio Info Slide-Over Drawer Controller
 * Handles opening, closing, tab switching, and keyboard ESC.
 */
(function () {
  const drawer = document.getElementById('studioDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const closeBtn = document.getElementById('drawerClose');
  const navTabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.pane');
  const triggerBtns = document.querySelectorAll('[data-open-drawer]');

  function openDrawer(targetPane) {
    if (targetPane) switchPane(targetPane);
    drawer.classList.remove('is-closed');
    backdrop.classList.remove('is-hidden');
  }

  function closeDrawer() {
    drawer.classList.add('is-closed');
    backdrop.classList.add('is-hidden');
  }

  function switchPane(paneId) {
    navTabs.forEach((t) => t.classList.toggle('active', t.getAttribute('data-pane') === paneId));
    panes.forEach((p) => p.classList.toggle('active', p.id === `pane-${paneId}`));
  }

  triggerBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pane = btn.getAttribute('data-open-drawer');
      openDrawer(pane);
    });
  });

  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const pane = tab.getAttribute('data-pane');
      switchPane(pane);
    });
  });

  closeBtn.addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.classList.contains('is-closed')) {
      closeDrawer();
    }
  });
})();
