"use client";

import React, { useState } from "react";

export interface TestimonialV2Item {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  metric?: string;
  metricLabel?: string;
}

export const TESTIMONIALS_V2_DATA: TestimonialV2Item[] = [
  {
    id: "1",
    name: "Sarah Jenkins",
    title: "Chief Design Officer",
    company: "Stratos Systems",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
    quote: "Integrating these micro-interactions into our design system eliminated months of back-and-forth between design and engineering teams.",
    rating: 5,
    metric: "4.8x",
    metricLabel: "Faster Dev Velocity"
  },
  {
    id: "2",
    name: "Alexandre Moreau",
    title: "Lead Frontend Engineer",
    company: "Luminary AI",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
    quote: "Clean code structure, zero dependency bloat, and instant copy-paste usability. Exactly how modern web blocks should be packaged.",
    rating: 5,
    metric: "99.4%",
    metricLabel: "Satisfaction Rate"
  },
  {
    id: "3",
    name: "Chloe Zhao",
    title: "Product Growth Lead",
    company: "Apex Scale",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    quote: "The visual polish and tactile spring curves boosted user engagement across all key onboarding steps.",
    rating: 5,
    metric: "+38%",
    metricLabel: "Conversion Lift"
  }
];

export default function TestimonialV2({
  items = TESTIMONIALS_V2_DATA,
  badge = "Client Endorsements",
  heading = "Validated by industry professionals"
}: {
  items?: TestimonialV2Item[];
  badge?: string;
  heading?: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = items[activeIdx] || items[0];

  return (
    <section className="relative w-full py-20 px-6 bg-neutral-950 text-white flex justify-center items-center">
      <div className="max-w-5xl w-full flex flex-col md:flex-row gap-12 items-center">
        {/* Metric Badge Column */}
        <div className="flex-1 flex flex-col items-start">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-indigo-400 mb-3">
            {badge}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-8">
            {heading}
          </h2>

          <div className="flex items-center gap-6 p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <div>
              <div className="text-4xl font-extrabold text-indigo-400 font-mono">
                {active.metric}
              </div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider mt-1 font-mono">
                {active.metricLabel}
              </div>
            </div>
            <div className="h-10 w-px bg-neutral-800" />
            <div className="flex flex-col">
              <div className="text-amber-400 text-sm">{"★".repeat(active.rating)}</div>
              <span className="text-xs text-neutral-400 mt-1">Verified Client</span>
            </div>
          </div>
        </div>

        {/* Testimonial Quote Card */}
        <div className="flex-1 w-full bg-neutral-900/40 border border-neutral-800 p-8 rounded-3xl relative backdrop-blur-md">
          <div className="text-indigo-400 text-4xl font-serif mb-4 leading-none">&ldquo;</div>
          <p className="text-lg md:text-xl font-light leading-relaxed text-neutral-200 mb-8">
            {active.quote}
          </p>

          <div className="flex items-center justify-between border-t border-neutral-800/80 pt-6">
            <div className="flex items-center gap-4">
              <img
                src={active.avatar}
                alt={active.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40"
              />
              <div>
                <h4 className="font-semibold text-white">{active.name}</h4>
                <p className="text-xs text-neutral-400">{active.title} &bull; {active.company}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === activeIdx ? "bg-indigo-500 w-6" : "bg-neutral-700"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
