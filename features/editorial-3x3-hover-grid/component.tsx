import React, { useState } from 'react';

interface GridCell {
  id: string;
  title: string;
  tag: string;
  images: string[];
  url?: string;
}

const CELLS: GridCell[] = [
  { id: '01', title: 'Patrick Mahomes', tag: 'SPORTS ACTION', images: ['/assets/library/patrick-mahomes-thumb-4ce12ce7.png', '/assets/library/patrick-mahomes-mesh-1-b5630223.png'] },
  { id: '02', title: 'La Marzocco Craft', tag: 'COMMERCIAL ARCHIVE', images: ['/assets/library/la-marzocco-thumb-a0214898.png', '/assets/library/la-marzocco-mesh-1-8fcb71a2.png'] },
  { id: '03', title: 'Air Space Intelligence', tag: 'AEROSPACE MONOGRAPH', images: ['/assets/library/air-space-intelligence-thumb-0f3ac386.png', '/assets/library/air-space-intelligence-mesh-1-b15a18b9.png'] },
  { id: '04', title: 'Applause Monolith', tag: 'EDITORIAL SERIES', images: ['/assets/library/applause-thumb-ae19f430.png', '/assets/library/applause-mesh-1-2b2e4eb0.png'] },
  { id: '06', title: 'Bad Boys Cinema', tag: 'CINEMATIC STREET', images: ['/assets/library/bad-boys-thumb-6bf21a1e.png', '/assets/library/bad-boys-mesh-1-7c1d1043.png'] },
  { id: '07', title: '0G Spatial Motion', tag: 'GRAVITY EXPERIMENTAL', images: ['/assets/library/0g-thumb-3ba91606.png', '/assets/library/0g-mesh-1-f88940d8.png'] },
  { id: '08', title: 'Margarita Studio', tag: 'PORTRAIT MONOGRAPH', images: ['/assets/library/margarita-vigule-0213f7e4.png', '/assets/library/iyo-thumb-41d5f334.png'] },
  { id: '09', title: 'Pelé Heritage', tag: 'CULTURAL LEGACY', images: ['/assets/library/pele-foundation-thumb-c189a772.png', '/assets/library/pele-foundation-mesh-1-bde5ac02.png'] }
];

export const Editorial3x3HoverGrid: React.FC = () => {
  const [activeCell, setActiveCell] = useState<GridCell | null>(null);

  const title = activeCell ? activeCell.title : 'Margarita Vigule';
  const tag = activeCell ? activeCell.tag : 'PHOTOGRAPHY ARCHIVE • 2026';

  return (
    <div className="relative w-full h-[640px] bg-[#0b0b0e] flex items-center justify-center p-6 select-none overflow-hidden text-white font-sans">
      {/* Dynamic Headline Overlay */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none text-center flex flex-col items-center gap-2">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-xl transition-all duration-300">
          {title}
        </h1>
        <span className="text-xs font-semibold tracking-widest text-red-500 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-red-500/30">
          {tag}
        </span>
      </div>

      {/* Scattered Stage */}
      {activeCell && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          {activeCell.images.map((img, i) => (
            <div
              key={i}
              className="absolute rounded-lg overflow-hidden shadow-2xl border border-white/20 transition-all duration-300"
              style={{
                top: i === 0 ? '12%' : 'auto',
                bottom: i === 1 ? '14%' : 'auto',
                left: i === 0 ? '10%' : 'auto',
                right: i === 1 ? '12%' : 'auto',
                width: i === 0 ? '200px' : '220px',
                height: i === 0 ? '130px' : '150px',
                transform: `rotate(${i === 0 ? '-4deg' : '5deg'})`
              }}
            >
              <img src={img} alt={activeCell.title} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* 3x3 Grid */}
      <div className="relative z-10 grid grid-cols-3 grid-rows-3 gap-3 w-full h-full">
        {CELLS.slice(0, 4).map((c) => (
          <div
            key={c.id}
            onMouseEnter={() => setActiveCell(c)}
            onMouseLeave={() => setActiveCell(null)}
            className="bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 hover:border-white/30 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer backdrop-blur-sm"
          >
            <span className="text-xs text-gray-500 font-mono">{c.id}</span>
            <span className="text-sm font-semibold text-gray-300">{c.title}</span>
          </div>
        ))}

        {/* Center Neutral Pulse Cell */}
        <div className="border border-dashed border-white/10 rounded-xl flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border border-red-500/40 animate-ping opacity-60" />
        </div>

        {CELLS.slice(4).map((c) => (
          <div
            key={c.id}
            onMouseEnter={() => setActiveCell(c)}
            onMouseLeave={() => setActiveCell(null)}
            className="bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 hover:border-white/30 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer backdrop-blur-sm"
          >
            <span className="text-xs text-gray-500 font-mono">{c.id}</span>
            <span className="text-sm font-semibold text-gray-300">{c.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
