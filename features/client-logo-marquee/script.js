/**
 * Infinite Dual-Direction Partner Logo Marquee
 * The names live in index.html (so they can be edited); the script only adds the looping copy of each row
 * and keeps it in step when a name is changed.
 */
(function () {
  document.querySelectorAll('.clients-marquee').forEach((row) => {
    const group = row.querySelector('.clients-marquee__group');
    if (!group) return;
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    row.appendChild(clone);
    const sync = () => { clone.innerHTML = group.innerHTML; };
    new MutationObserver(sync).observe(group, { childList: true, characterData: true, subtree: true });
  });

  const btn = document.getElementById('speed-toggle');
  let fast = false;
  if (btn) {
    btn.addEventListener('click', () => {
      fast = !fast;
      document.documentElement.style.setProperty('--marquee-duration', fast ? '12s' : '26s');
      btn.textContent = fast ? 'Speed: Turbo (2.2x)' : 'Speed: Normal (1x)';
    });
  }
})();
