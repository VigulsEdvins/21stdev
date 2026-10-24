import React, { useState } from 'react';

type Category = 'all' | 'sports' | 'commercial' | 'portraits' | 'editorial';

interface Project {
  id: string;
  cat: Category;
  title: string;
  client: string;
  year: string;
  desc: string;
  img: string;
}

const PROJECTS: Project[] = [
  { id: '1', cat: 'sports', title: 'Patrick Mahomes MVP Series', client: 'Kansas City', year: '2025', desc: 'Dynamic stadium monochrome series.', img: '/assets/library/patrick-mahomes-thumb-4ce12ce7.png' },
  { id: '2', cat: 'commercial', title: 'La Marzocco Heritage', client: 'Florence Studio', year: '2024', desc: 'Espresso machine artisanal metal fabrication documentary.', img: '/assets/library/la-marzocco-thumb-a0214898.png' },
  { id: '3', cat: 'portraits', title: 'Margarita Studio Sessions', client: 'Self Monograph', year: '2026', desc: 'Directional tungsten lighting and silhouette study.', img: '/assets/library/margarita-vigule-0213f7e4.png' },
  { id: '4', cat: 'editorial', title: 'Applause Monolith', client: 'Fashion Archive', year: '2024', desc: 'Runway couture and sculptural garment drape.', img: '/assets/library/applause-thumb-ae19f430.png' },
  { id: '5', cat: 'commercial', title: 'Air Space Intelligence', client: 'Aero Systems', year: '2025', desc: 'Industrial flight deck documentary.', img: '/assets/library/air-space-intelligence-thumb-0f3ac386.png' },
  { id: '6', cat: 'editorial', title: 'Bad Boys Cinema', client: 'Film Series', year: '2024', desc: 'Miami night street cinematography.', img: '/assets/library/bad-boys-thumb-6bf21a1e.png' },
  { id: '7', cat: 'sports', title: 'Pelé Heritage Foundation', client: 'Santos Archive', year: '2025', desc: 'Vintage football heritage preservation.', img: '/assets/library/pele-foundation-thumb-c189a772.png' },
  { id: '8', cat: 'portraits', title: 'Iyo Spatial Audio', client: 'Audio Monograph', year: '2024', desc: 'Ear-worn acoustics and minimal human-device interface.', img: '/assets/library/iyo-thumb-41d5f334.png' }
];

export const PortfolioMasonryFilter: React.FC = () => {
  const [filter, setFilter] = useState<Category>('all');
  const [selected, setSelected] = useState<Project | null>(null);

  const filtered = filter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.cat === filter);

  return (
    <div className="w-full max-w-5xl mx-auto bg-[#0b0b0e] text-white p-6 font-sans flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center border-b border-white/10 pb-4 gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold">Selected Works</h2>
          <span className="text-xs text-gray-500">Showing {filtered.length} of {PROJECTS.length} projects</span>
        </div>

        <nav className="flex gap-2">
          {(['all', 'sports', 'commercial', 'portraits', 'editorial'] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === c ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <article
            key={item.id}
            onClick={() => setSelected(item)}
            className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 cursor-pointer aspect-[4/5] hover:-translate-y-1 transition-all"
          >
            <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-1">
              <span className="text-[9px] font-bold text-red-500 tracking-wider uppercase">{item.cat}</span>
              <h3 className="text-xs font-semibold text-white truncate">{item.title}</h3>
              <span className="text-[10px] text-gray-400">{item.year}</span>
            </div>
          </article>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="relative bg-[#141419] border border-white/20 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white flex items-center justify-center text-sm z-10">&times;</button>
            <img src={selected.img} alt={selected.title} className="w-full max-h-72 object-cover" />
            <div className="p-5 flex flex-col gap-2">
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{selected.cat}</span>
              <h3 className="text-lg font-bold text-white">{selected.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{selected.desc}</p>
              <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t border-white/10 mt-2">
                <span>Client: <strong className="text-gray-300">{selected.client}</strong></span>
                <span>Year: <strong className="text-gray-300">{selected.year}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
