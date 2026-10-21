import React, { useState } from 'react';

const RULES = [
  {
    regex: /\b(?:responsible for managing|responsible for)\b/gi,
    weak: 'responsible for managing',
    replacements: ['Spearheaded', 'Architected', 'Directed']
  },
  {
    regex: /\b(?:helped with|assisted with)\b/gi,
    weak: 'helped with',
    replacements: ['Accelerated', 'Co-engineered', 'Facilitated']
  },
  {
    regex: /\b(?:worked on|worked with)\b/gi,
    weak: 'worked on',
    replacements: ['Engineered', 'Developed', 'Delivered']
  }
];

export const StarVerbEnhancer: React.FC = () => {
  const [bullet, setBullet] = useState<string>(
    'Responsible for managing frontend codebase and helped with speeding up database queries for our clients.'
  );

  const detected = RULES.filter((r) => r.regex.test(bullet));

  const replacePhrase = (rule: typeof RULES[0], replacement: string) => {
    setBullet((prev) => prev.replace(rule.regex, replacement));
  };

  const words = bullet.trim().split(' ');
  const leadWord = words[0] || '';
  const restWords = words.slice(1).join(' ');

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-white/10 rounded-2xl p-6 text-white font-sans flex flex-col gap-5 shadow-2xl">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-teal-400 tracking-wider">CAREER WRITING SUITE</span>
          <h2 className="text-xl font-bold">STAR Accomplishment Builder</h2>
        </div>
        <span className="text-xs text-gray-400">Situation • Task • Action • Result</span>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-300 block mb-1">Draft Experience Bullet Point</label>
        <textarea
          value={bullet}
          onChange={(e) => setBullet(e.target.value)}
          rows={3}
          className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-teal-500"
        />
      </div>

      {detected.length > 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3">
          <span className="text-xs font-bold text-amber-300">
            {detected.length} Passive Verbs Detected &mdash; 1-Click Power Replacements:
          </span>
          <div className="space-y-2">
            {detected.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="line-through text-red-400">"{d.weak}"</span>
                <span className="text-gray-500">&rarr;</span>
                <div className="flex gap-1.5">
                  {d.replacements.map((r) => (
                    <button
                      key={r}
                      onClick={() => replacePhrase(d, r)}
                      className="bg-teal-500/20 hover:bg-teal-600 text-teal-300 hover:text-white px-2 py-0.5 rounded text-[11px] font-bold transition-all"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 font-semibold">
          ✓ 100% Executive Power Verbs! Your bullet demonstrates strong proactive leadership.
        </div>
      )}

      {/* Rendered Preview */}
      <div className="bg-white text-slate-900 rounded-xl p-4 flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Final Resume Render</span>
        <p className="text-xs leading-relaxed text-slate-800">
          &bull; <strong>{leadWord}</strong> {restWords}
        </p>
      </div>
    </div>
  );
};
