import React, { useState, useRef } from 'react';

export const BeforeAfterResumeSlider: React.FC = () => {
  const [position, setPosition] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setPosition(pct);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-4 p-6 bg-[#0b0f17] text-white font-sans select-none">
      <div className="text-center">
        <span className="text-xs font-bold text-teal-400 tracking-wider">INTERACTIVE COMPARISON</span>
        <h2 className="text-xl font-bold">Resume Transformation Engine</h2>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerMove}
        onPointerMove={handlePointerMove}
        className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl cursor-ew-resize bg-slate-900"
      >
        {/* Before */}
        <div className="absolute inset-0 bg-zinc-900 p-8 text-zinc-400 font-mono text-xs leading-relaxed overflow-hidden">
          <span className="absolute top-3 left-3 bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full font-sans">
            BEFORE • UNSTRUCTURED
          </span>
          <pre className="mt-6">
{`EDVINS VIGULS
Developer - Riga, Latvia - edvins@example.com

SUMMARY:
I am a developer who has worked on web apps for several years.
Responsible for coding frontends and doing backend tasks too.

EXPERIENCE:
Software Company (2022-2025)
- worked on the website redesign
- helped make things faster
- helped with the database`}
          </pre>
        </div>

        {/* After */}
        <div
          className="absolute inset-0 bg-white text-slate-900 grid grid-cols-[180px_1fr]"
          style={{ clipPath: `polygon(${position}% 0, 100% 0, 100% 100%, ${position}% 100%)` }}
        >
          <span className="absolute top-3 right-3 bg-teal-500/10 text-teal-600 border border-teal-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full z-10">
            AFTER • ATS ARCHITECT
          </span>

          <div className="bg-teal-600 text-white p-6 flex flex-col items-center text-center gap-2 pt-10">
            <div className="w-12 h-12 rounded-full bg-teal-700 border border-white flex items-center justify-center font-bold text-sm">EV</div>
            <h3 className="text-xs font-bold">Edvīns Vīguls</h3>
            <span className="text-[10px] text-teal-100">Lead Frontend Architect</span>
          </div>

          <div className="p-6 pt-10 flex flex-col gap-3">
            <h4 className="text-[10px] font-bold uppercase text-teal-700 border-b-2 border-teal-600 pb-0.5">Executive Summary</h4>
            <p className="text-[11px] text-slate-700 leading-snug">High-impact engineer architecting 60fps visual applications and distributed services.</p>
            <h4 className="text-[10px] font-bold uppercase text-teal-700 border-b-2 border-teal-600 pb-0.5 mt-2">Work Experience</h4>
            <ul className="text-[10px] text-slate-600 space-y-1 list-disc pl-3">
              <li><strong>Spearheaded</strong> portal overhaul, reducing load times by 42%.</li>
              <li><strong>Architected</strong> modular component vault adopted across 18 pods.</li>
            </ul>
          </div>
        </div>

        {/* Handle */}
        <div
          className="absolute top-0 bottom-0 w-8 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
          style={{ left: `${position}%` }}
        >
          <div className="w-0.5 flex-1 bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
          <div className="w-7 h-7 rounded-full bg-teal-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg">
            ↔
          </div>
          <div className="w-0.5 flex-1 bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
        </div>
      </div>
    </div>
  );
};
