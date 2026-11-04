// Animated number counters
document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('.tah-counter[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count'), 10);
        if (!isNaN(target)) {
          let current = 0;
          const duration = 1200;
          const step = Math.max(1, Math.ceil(target / (duration / 20)));
          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              el.textContent = String(target);
              clearInterval(timer);
            } else {
              el.textContent = String(current);
            }
          }, 20);
        }
        obs.unobserve(el);
      }
    });
  }, { threshold: 0.2 });

  counters.forEach(c => observer.observe(c));
});
