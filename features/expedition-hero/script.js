export function initExpeditionHero(root = document) {
  const wrap = root.querySelector('.exp-hero-wrap');
  if (!wrap) return;
  const frame = wrap.querySelector('.exp-hero-frame');
  if (!frame) return;

  setTimeout(() => {
    frame.style.clipPath = 'inset(0% 0px 0px 0px)';
  }, 100);
}

if (typeof window !== 'undefined') {
  initExpeditionHero();
}
