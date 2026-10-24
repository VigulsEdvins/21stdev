"use client";

import React, { useState } from "react";

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
  featured?: boolean;
}

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: "1",
    name: "Elena Rostova",
    role: "Head of Product",
    company: "Veloce Labs",
    avatar: "/assets/library/photo-1534528741775-53994a69daeb-bd154484.jpg",
    quote: "The subtle attention to physics and tactile feedback transformed our user retention. It feels like software built by craftsmen.",
    rating: 5,
    featured: true
  },
  {
    id: "2",
    name: "Marcus Vance",
    role: "Design Architect",
    company: "Monolith Media",
    avatar: "/assets/library/photo-1507003211169-0a1dd7228f2d-d65277f1.jpg",
    quote: "Stands entirely apart from boring quote grids. The staggered layout gives every testimonial its own breathing room.",
    rating: 5
  },
  {
    id: "3",
    name: "Aria Chen",
    role: "Founder & CEO",
    company: "Hyperion AI",
    avatar: "/assets/library/photo-1517841905240-472988babdf9-dcba0d88.jpg",
    quote: "Integrated directly into our landing page within an hour. Zero unnecessary motion weight, just pure responsive elegance.",
    rating: 5
  },
  {
    id: "4",
    name: "Julian Thorne",
    role: "VP Engineering",
    company: "Synthesis Cloud",
    avatar: "/assets/library/photo-1500648767791-00dcc994a43e-8046e619.jpg",
    quote: "Our customer conversion jumped by 24% after replacing static cards with this staggered dynamic review section.",
    rating: 5
  }
];

export default function StaggerTestimonials({
  items = TESTIMONIALS_DATA,
  title = "Loved by builders worldwide",
  subtitle = "Real feedback from engineers, designers, and tech leaders."
}: {
  items?: TestimonialItem[];
  title?: string;
  subtitle?: string;
}) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || "1");

  return (
    <section className="relative w-full py-16 px-6 bg-neutral-950 text-white overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <div className="text-center mb-14 max-w-xl">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-indigo-400">
            Social Proof
          </span>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mt-3 mb-4">
            {title}
          </h2>
          <p className="text-neutral-400 text-base font-light">
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full items-start">
          {items.map((item, index) => {
            const isFeatured = item.id === activeId;
            const staggerOffset = (index % 2 === 1) ? "md:translate-y-8" : "";

            return (
              <div
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 border ${
                  isFeatured
                    ? "bg-neutral-900/90 border-indigo-500/60 shadow-2xl shadow-indigo-500/10 scale-[1.02]"
                    : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60"
                } ${staggerOffset}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="w-11 h-11 rounded-full object-cover border border-neutral-700"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-neutral-100">{item.name}</h4>
                    <p className="text-xs text-neutral-400">{item.role} &bull; {item.company}</p>
                  </div>
                </div>

                <div className="flex text-amber-400 text-xs mb-3">
                  {"★".repeat(item.rating)}
                </div>

                <p className="text-sm text-neutral-300 leading-relaxed font-light">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
