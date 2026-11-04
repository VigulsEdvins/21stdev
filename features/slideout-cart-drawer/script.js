export function initSlideoutCartDrawer(root = document) {
  const wrap = root.querySelector('.sc-wrapper');
  if (!wrap) return;

  const drawer = wrap.querySelector('#sc-drawer');
  const backdrop = wrap.querySelector('#sc-backdrop');
  const openBtn = wrap.querySelector('#sc-open-trigger');
  const closeBtn = wrap.querySelector('#sc-close-trigger');
  const list = wrap.querySelector('#sc-items-list');
  const totalEl = wrap.querySelector('#sc-total-val');
  const badgeEl = wrap.querySelector('#sc-count-badge');

  function open() {
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
  }

  function close() {
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
  }

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  function recalc() {
    if (!list) return;
    const items = list.querySelectorAll('.sc-item');
    let total = 0;
    let count = 0;
    items.forEach(it => {
      const price = parseInt(it.querySelector('.sc-item-price')?.textContent?.replace('€', '') || '0', 10);
      const qty = parseInt(it.querySelector('.sc-qty-val')?.textContent || '1', 10);
      total += price * qty;
      count += qty;
    });
    if (totalEl) totalEl.textContent = `€${total}`;
    if (badgeEl) badgeEl.textContent = String(count);
  }

  list?.querySelectorAll('.sc-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.sc-item')?.remove();
      recalc();
    });
  });

  list?.querySelectorAll('.sc-qty-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const valEl = btn.parentElement.querySelector('.sc-qty-val');
      if (valEl) valEl.textContent = String(parseInt(valEl.textContent, 10) + 1);
      recalc();
    });
  });

  list?.querySelectorAll('.sc-qty-sub').forEach(btn => {
    btn.addEventListener('click', () => {
      const valEl = btn.parentElement.querySelector('.sc-qty-val');
      if (valEl) {
        const cur = parseInt(valEl.textContent, 10);
        if (cur > 1) {
          valEl.textContent = String(cur - 1);
          recalc();
        } else {
          btn.closest('.sc-item')?.remove();
          recalc();
        }
      }
    });
  });
}

if (typeof window !== 'undefined') {
  initSlideoutCartDrawer();
}
