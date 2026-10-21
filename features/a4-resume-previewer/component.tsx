import React, { useState } from 'react';

export const A4ResumePreviewer: React.FC = () => {
  const [zoom, setZoom] = useState<number>(0.85);
  const [showBreak, setShowBreak] = useState<boolean>(true);

  return (
    <div className="w-full flex flex-col h-screen bg-[#0b0f17] text-white font-sans overflow-hidden">
      {/* Top Toolbar */}
      <header className="h-12 bg-gray-900 border-b border-white/10 flex justify-between items-center px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
            A4 PREVIEW
          </span>
          <span className="text-xs text-gray-400">210 × 297 mm</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs">−</button>
          <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs">+</button>
          <button onClick={() => setShowBreak(!showBreak)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-semibold">
            Break: {showBreak ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => window.print()} className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold">
            Print / PDF
          </button>
        </div>
      </header>

      {/* Canvas */}
      <main className="flex-1 overflow-auto bg-slate-900 flex justify-center items-start p-8">
        <div
          className="relative bg-white text-slate-900 shadow-2xl grid grid-cols-[260px_1fr] origin-top transition-transform duration-200"
          style={{ width: '794px', minHeight: '1123px', transform: `scale(${zoom})` }}
        >
          {showBreak && (
            <div className="absolute top-[1123px] left-0 right-0 border-t-2 border-dashed border-red-500 flex justify-end z-30 pointer-events-none">
              <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5">PAGE 1 BOUNDARY</span>
            </div>
          )}

          {/* Left Teal Sidebar */}
          <aside className="bg-teal-600 text-white p-7 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-2 pb-4 border-b border-white/20">
              <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center font-bold text-xl bg-teal-700">EV</div>
              <h1 className="text-lg font-bold">Edvīns Vīguls</h1>
              <p className="text-xs text-teal-100">Senior Full-Stack Engineer</p>
            </div>
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-teal-200 border-b border-white/20 pb-1 mb-2">Contact</h2>
              <ul className="text-xs space-y-1 text-teal-50">
                <li>Riga, Latvia</li>
                <li>edvins@example.com</li>
                <li>github.com/edvins</li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs uppercase font-bold tracking-wider text-teal-200 border-b border-white/20 pb-1 mb-2">Technical Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Three.js', 'Tailwind'].map((s) => (
                  <span key={s} className="bg-white/20 text-[10px] px-2 py-0.5 rounded font-semibold">{s}</span>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Main Column */}
          <section className="p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 border-b-2 border-teal-600 pb-1 mb-2">Executive Summary</h2>
              <p className="text-xs text-slate-700 leading-relaxed">
                High-impact Software Engineer with 8+ years architecting visual web applications and resilient distributed services.
              </p>
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 border-b-2 border-teal-600 pb-1 mb-3">Work Experience</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold text-slate-900">Lead Frontend Architect</span>
                    <span className="font-semibold text-teal-600">2022 – Present</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mb-1">NextGen Digital Labs</span>
                  <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                    <li><strong>Spearheaded</strong> client portal revamp, boosting sub-second loads by 42%.</li>
                    <li><strong>Architected</strong> modular WebGL component design system.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
