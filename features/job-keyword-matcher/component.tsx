import React, { useState, useMemo } from 'react';

const DICTIONARY = [
  'TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes',
  'Three.js', 'WebGL', 'Tailwind CSS', 'CI/CD', 'GraphQL', 'AWS', 'GCP', 'Terraform',
  'Prometheus', 'Microservices', 'State Management', 'Agile'
];

export const JobKeywordMatcher: React.FC = () => {
  const [jobText, setJobText] = useState<string>(
    'We are looking for a Senior Frontend Architect proficient in TypeScript, React, Next.js, and Tailwind CSS. The ideal candidate has deep experience with WebGL or Three.js, CI/CD automation, state management, Docker containers, GraphQL, and micro-frontend architectures.'
  );
  const [mySkills, setMySkills] = useState<string[]>([
    'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Three.js', 'Tailwind CSS'
  ]);

  const { matched, missing, score } = useMemo(() => {
    const raw = jobText.toLowerCase();
    const matchedArr: string[] = [];
    const missingArr: string[] = [];

    DICTIONARY.forEach((kw) => {
      const regex = new RegExp(`\\b${kw.toLowerCase()}\\b`, 'i');
      if (regex.test(raw)) {
        if (mySkills.map((s) => s.toLowerCase()).includes(kw.toLowerCase())) {
          matchedArr.push(kw);
        } else {
          missingArr.push(kw);
        }
      }
    });

    const total = matchedArr.length + missingArr.length;
    const calcScore = total === 0 ? 0 : Math.round((matchedArr.length / total) * 100);
    return { matched: matchedArr, missing: missingArr, score: calcScore };
  }, [jobText, mySkills]);

  const addMissingSkill = (skill: string) => {
    setMySkills((prev) => [...prev, skill]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-white/10 rounded-2xl p-6 text-white font-sans flex flex-col gap-5 shadow-2xl">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-xs font-bold text-teal-400 tracking-wider">ATS ENGINE</span>
          <h2 className="text-xl font-bold">Job Keyword Gap Analyzer</h2>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl">
        <div className="w-16 h-16 rounded-full bg-teal-950 border-2 border-teal-500 flex flex-col items-center justify-center shrink-0">
          <span className="text-lg font-bold text-teal-300 leading-none">{score}%</span>
          <span className="text-[9px] font-bold text-teal-400">MATCH</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            {score >= 75 ? 'Strong ATS Alignment' : 'Improvement Recommended'}
          </h3>
          <p className="text-xs text-gray-400">
            {matched.length} matched competencies, {missing.length} missing from active profile.
          </p>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-300 block mb-1">Target Job Description</label>
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          rows={4}
          className="w-full bg-black/40 border border-white/15 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-teal-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
          <span className="text-xs font-bold text-emerald-400 block mb-2">Matched ({matched.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {matched.map((kw) => (
              <span key={kw} className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-semibold">
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3">
          <span className="text-xs font-bold text-amber-400 block mb-2">Missing &mdash; Click to Add ({missing.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((kw) => (
              <button
                key={kw}
                onClick={() => addMissingSkill(kw)}
                className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] px-2 py-0.5 rounded font-semibold transition-all cursor-pointer"
              >
                {kw} +
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
