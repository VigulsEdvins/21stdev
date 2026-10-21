/**
 * Lightweight Client-Side Multilingual Dictionary & Reactive Switcher
 * Extracted from Margarita Vigule portfolio (i18n.js)
 */
(function () {
  const STORAGE_KEY = 'vigule_preferred_lang_v1';

  const DICTIONARY = {
    lv: {
      'hero.tag': 'PORTFOLIO • 2026',
      'hero.title': 'Tverot patiesus mirkļus, sporta dinamiku un kultūras notikumus.',
      'hero.desc': 'Profesionāla fotogrāfe no Daugavpils. Specializējos sporta reportāžās, komerciālajā fotogrāfijā un ekspresīvos portretos visā Latvijā un Eiropā.',
      'actions.viewWork': 'Skatīt visus darbus',
      'actions.contact': 'Sazināties ar studiju'
    },
    en: {
      'hero.tag': 'PORTFOLIO • 2026',
      'hero.title': 'Capturing genuine moments, sports action, and cultural events.',
      'hero.desc': 'Professional photographer based in Daugavpils, Latvia. Specializing in high-speed sports action, commercial editorial, and expressive portraiture across Europe.',
      'actions.viewWork': 'Explore All Work',
      'actions.contact': 'Contact Studio'
    },
    ru: {
      'hero.tag': 'ПОРТФОЛИО • 2026',
      'hero.title': 'Искренние моменты, динамика спорта и культурные события.',
      'hero.desc': 'Профессиональный фотограф из Даугавпилса. Специализируюсь на спортивном экшене, коммерческой съёмке и выразительных портретах.',
      'actions.viewWork': 'Смотреть все работы',
      'actions.contact': 'Связаться со студией'
    }
  };

  let currentLang = 'lv';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && DICTIONARY[saved]) currentLang = saved;
  } catch (_) {}

  const buttons = document.querySelectorAll('.lang-btn');
  const elements = document.querySelectorAll('[data-i18n]');
  const debugEl = document.getElementById('localeDebug');

  function updateLanguage(newLang) {
    if (!DICTIONARY[newLang]) return;
    currentLang = newLang;
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (_) {}

    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === newLang);
    });

    elements.forEach((el) => {
      el.classList.add('fade-out');
    });

    setTimeout(() => {
      elements.forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (DICTIONARY[newLang][key]) {
          el.textContent = DICTIONARY[newLang][key];
        }
        el.classList.remove('fade-out');
      });

      if (debugEl) {
        debugEl.innerHTML = `ACTIVE LOCALE: <strong>${newLang.toUpperCase()}</strong> (Saved in localStorage)`;
      }
    }, 180);
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-lang');
      if (target !== currentLang) updateLanguage(target);
    });
  });

  updateLanguage(currentLang);
})();
