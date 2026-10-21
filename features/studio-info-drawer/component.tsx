import React, { useState } from 'react';

type PaneId = 'about' | 'gear' | 'contact' | 'terms';

export const StudioInfoDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activePane, setActivePane] = useState<PaneId>('about');

  return (
    <div className="w-full flex items-center justify-center p-6 bg-[#0b0b0e] text-white font-sans">
      <div className="max-w-md w-full bg-[#141419] border border-white/10 rounded-2xl p-7 text-center flex flex-col items-center gap-4 shadow-2xl">
        <span className="text-xs font-bold text-red-500 tracking-widest">STUDIO DRAWER COMPONENT</span>
        <h2 className="text-xl font-bold">Margarita Vigule Studio</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          Slide-over info panel with multi-pane navigation, photographer portrait, contact links, and gear inventory.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => { setActivePane('about'); setIsOpen(true); }}
            className="bg-white text-black text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 transition-all"
          >
            About
          </button>
          <button
            onClick={() => { setActivePane('gear'); setIsOpen(true); }}
            className="bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
          >
            Gear
          </button>
          <button
            onClick={() => { setActivePane('contact'); setIsOpen(true); }}
            className="bg-white/10 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
          >
            Contact
          </button>
        </div>
      </div>

      {/* Slide-over Drawer */}
      <aside className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#111116] border-l border-white/10 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <nav className="flex gap-2">
            {(['about', 'gear', 'contact', 'terms'] as PaneId[]).map((p) => (
              <button
                key={p}
                onClick={() => setActivePane(p)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${activePane === p ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white flex items-center justify-center text-sm">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {activePane === 'about' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <img src="/mom/public/images/margarita-vigule.png" alt="Margarita" className="w-20 h-20 rounded-xl object-cover border border-white/20" />
                <div>
                  <span className="text-[10px] font-bold text-red-500 tracking-wider">PHOTOGRAPHER • LATVIA</span>
                  <h3 className="text-sm font-semibold italic text-white mt-1">"Capturing genuine human action and raw emotional atmosphere."</h3>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Margarita Vigule is an editorial and sports photographer working between Daugavpils and Riga, Latvia. Known for directional lighting, high-contrast monochrome studies, and cinematic sideline reportage.
              </p>
            </div>
          )}

          {activePane === 'gear' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-white">Equipment &amp; Optics</h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-xs font-semibold text-white block">Sony A1 • 50.1MP Flagship</span>
                <span className="text-[11px] text-gray-400">30fps blackout-free burst for high-speed athletics</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <span className="text-xs font-semibold text-white block">Sony FE 400mm f/2.8 GM OSS</span>
                <span className="text-[11px] text-gray-400">Prime stadium reach and background compression</span>
              </div>
            </div>
          )}

          {activePane === 'contact' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-white">Booking &amp; Inquiries</h3>
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">DIRECT EMAIL</span>
                  <a href="mailto:margaritavigule@inbox.lv" className="text-xs font-semibold text-red-400 hover:underline">margaritavigule@inbox.lv ↗</a>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold block">INSTAGRAM</span>
                  <a href="https://www.instagram.com/vigule_photographer/" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-red-400 hover:underline">@vigule_photographer ↗</a>
                </div>
              </div>
            </div>
          )}

          {activePane === 'terms' && (
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-white">Copyright &amp; Usage Rights</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                © 2026 Margarita Vigule. All rights reserved. Every photograph and video element featured across this domain is the protected intellectual property of the author.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Backdrop */}
      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
      )}
    </div>
  );
};
