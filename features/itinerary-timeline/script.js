function initItineraryTimeline(root = document) {
  const stops = root.querySelectorAll('.itin-stop');
  stops.forEach(stop => {
    stop.addEventListener('click', () => {
      stops.forEach(s => s.classList.remove('is-active'));
      stop.classList.add('is-active');
    });
  });
}

if (typeof window !== 'undefined') {
  initItineraryTimeline();
}
