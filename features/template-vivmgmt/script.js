(function () {
  const btn = document.getElementById('copyCmdBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const path = '/home/edvins/features-for-web/vivmgmt';
    if (navigator.clipboard) navigator.clipboard.writeText(path);
    btn.textContent = 'Copied: ' + path;
    setTimeout(() => { btn.textContent = 'Copy Folder Path'; }, 1800);
  });
})();
