(() => {
  const container = document.getElementById('athletic-pricing');
  if (!container) return;

  const btnMonthly = container.querySelector('#apc-monthly');
  const btnAnnual = container.querySelector('#apc-annual');
  const cards = container.querySelectorAll('.apc-card');

  function setBilling(annual) {
    btnMonthly.classList.toggle('active', !annual);
    btnMonthly.setAttribute('aria-pressed', String(!annual));

    btnAnnual.classList.toggle('active', annual);
    btnAnnual.setAttribute('aria-pressed', String(annual));

    cards.forEach((card) => {
      const priceEl = card.querySelector('.apc-price');
      const periodEl = card.querySelector('.apc-period');
      const monthlyVal = card.dataset.monthly;
      const annualVal = card.dataset.annual;

      if (priceEl) {
        priceEl.textContent = annual ? annualVal : monthlyVal;
      }
      if (periodEl) {
        periodEl.textContent = annual ? '/ month, billed annually' : '/ month';
      }
    });
  }

  btnMonthly?.addEventListener('click', () => setBilling(false));
  btnAnnual?.addEventListener('click', () => setBilling(true));
})();
