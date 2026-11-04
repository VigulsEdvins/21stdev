// Industry sectors accordion tabs switcher
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.isa-tab-item');
  const panels = document.querySelectorAll('.isa-panel');

  function selectTab(index) {
    tabs.forEach((tab, i) => {
      if (i === index) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    panels.forEach((panel, i) => {
      if (i === index) {
        panel.classList.remove('hidden');
        panel.classList.add('active');
      } else {
        panel.classList.add('hidden');
        panel.classList.remove('active');
      }
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(index));
  });
});
