export function initDropCountdownBanner(root = document) {
  const wrap = root.querySelector('.drop-bar-wrap');
  if (!wrap) return;

  const clockEl = wrap.querySelector('#drop-bar-countdown-val');
  if (!clockEl) return;

  // Next Thursday 18:00
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay();
  let diff = (4 - day + 7) % 7;
  if (diff === 0 && now.getHours() >= 18) diff = 7;
  target.setDate(now.getDate() + diff);
  target.setHours(18, 0, 0, 0);

  function update() {
    const distance = target.getTime() - Date.now();
    if (distance <= 0) {
      clockEl.textContent = 'RAILS LIVE NOW';
      return;
    }
    const d = Math.floor(distance / (1000 * 60 * 60 * 24));
    const h = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    const m = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const s = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
    clockEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }

  update();
  const timer = setInterval(update, 1000);
  return () => clearInterval(timer);
}

if (typeof window !== 'undefined') {
  initDropCountdownBanner();
}
