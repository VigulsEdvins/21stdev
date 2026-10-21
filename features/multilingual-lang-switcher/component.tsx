import React, { useState, useEffect } from 'react';

type Locale = 'lv' | 'en' | 'ru';

interface Translations {
  tag: string;
  title: string;
  desc: string;
  viewWork: string;
  contact: string;
}

const DICTIONARY: Record<Locale, Translations> = {
  lv: {
    tag: 'PORTFOLIO • 2026',
    title: 'Tverot patiesus mirkļus, sporta dinamiku un kultūras notikumus.',
    desc: 'Profesionāla fotogrāfe no Daugavpils. Specializējos sporta reportāžās, komerciālajā fotogrāfijā un ekspresīvos portretos visā Latvijā un Eiropā.',
    viewWork: 'Skatīt visus darbus',
    contact: 'Sazināties ar studiju'
  },
  en: {
    tag: 'PORTFOLIO • 2026',
    title: 'Capturing genuine moments, sports action, and cultural events.',
    desc: 'Professional photographer based in Daugavpils, Latvia. Specializing in high-speed sports action, commercial editorial, and expressive portraiture across Europe.',
    viewWork: 'Explore All Work',
    contact: 'Contact Studio'
  },
  ru: {
    tag: 'ПОРТФОЛИО • 2026',
    title: 'Искренние моменты, динамика спорта и культурные события.',
    desc: 'Профессиональный фотограф из Даугавпилса. Специализируюсь на спортивном экшене, коммерческой съёмке и выразительных портретах.',
    viewWork: 'Смотреть все работы',
    contact: 'Связаться со студией'
  }
};

export const MultilingualLangSwitcher: React.FC = () => {
  const [lang, setLang] = useState<Locale>('lv');
  const [fading, setFading] = useState<boolean>(false);

  const switchLanguage = (newLang: Locale) => {
    if (newLang === lang) return;
    setFading(true);
    setTimeout(() => {
      setLang(newLang);
      setFading(false);
    }, 180);
  };

  const t = DICTIONARY[lang];

  return (
    <div className="w-full max-w-xl mx-auto bg-[#141419] border border-white/10 rounded-2xl p-7 shadow-2xl text-white font-sans flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span className="text-sm font-bold tracking-wide">Margarita Vigule</span>
        </div>

        <nav className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
          {(['lv', 'en', 'ru'] as Locale[]).map((loc, idx) => (
            <React.Fragment key={loc}>
              <button
                type="button"
                onClick={() => switchLanguage(loc)}
                className={`px-2 py-0.5 rounded text-xs font-semibold tracking-wider transition-colors ${
                  lang === loc ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                {loc.toUpperCase()}
              </button>
              {idx < 2 && <span className="text-xs text-gray-600">/</span>}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold tracking-widest text-red-500">{t.tag}</span>
        <h2 className={`text-2xl font-bold leading-snug transition-all duration-200 ${fading ? 'opacity-0 translate-y-1' : 'opacity-100'}`}>
          {t.title}
        </h2>
        <p className={`text-sm text-gray-400 leading-relaxed transition-all duration-200 ${fading ? 'opacity-0 translate-y-1' : 'opacity-100'}`}>
          {t.desc}
        </p>

        <div className="flex gap-3 mt-2">
          <button className="bg-white hover:bg-gray-200 text-black px-4 py-2 rounded-lg text-xs font-semibold transition-all">
            {t.viewWork}
          </button>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all">
            {t.contact}
          </button>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3 flex justify-between text-xs text-gray-500">
        <span>Active Locale: <strong className="text-red-500">{lang.toUpperCase()}</strong></span>
        <span>Zero-dependency reactive i18n</span>
      </div>
    </div>
  );
};
