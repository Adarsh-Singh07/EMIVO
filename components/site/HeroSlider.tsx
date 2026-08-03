"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { HERO_SLIDES } from "@/lib/products";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function HeroSlider() {
  const [i, setI] = useState(0);
  const n = HERO_SLIDES.length;

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);

  const s = HERO_SLIDES[i];

  return (
    <section className="relative overflow-hidden">
      <div className={`bg-gradient-to-br ${s.bg}`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center min-h-[440px] lg:min-h-[560px] py-10 lg:py-0">
            <div key={`t-${s.id}`} className="fade-slide animate-[fadeIn_0.7s_ease]">
              <span className="inline-block text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">
                {s.eyebrow}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
                {s.title}
              </h1>
              <p className="mt-4 text-neutral-600 text-lg max-w-md">{s.subtitle}</p>
              <div className="mt-5 flex items-baseline gap-3">
                <span className="text-2xl font-semibold">{inr(s.price)}</span>
                <span className="text-neutral-400 line-through">{inr(s.mrp)}</span>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  href={s.link}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-neutral-950 text-white text-sm font-medium hover:bg-neutral-800"
                >
                  {s.cta} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-neutral-950 text-sm font-medium hover:bg-white"
                >
                  Browse All
                </Link>
              </div>
            </div>

            <div key={`i-${s.id}`} className="relative aspect-[4/3] lg:aspect-square">
              <img
                src={s.img}
                alt={s.title}
                className="absolute inset-0 w-full h-full object-contain object-center animate-[fadeIn_0.7s_ease]"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setI((v) => (v - 1 + n) % n)}
          className="hidden sm:grid absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 place-items-center rounded-full bg-white/80 backdrop-blur hover:bg-white shadow"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setI((v) => (v + 1) % n)}
          className="hidden sm:grid absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 place-items-center rounded-full bg-white/80 backdrop-blur hover:bg-white shadow"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {HERO_SLIDES.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                k === i ? "w-8 bg-neutral-950" : "w-2 bg-neutral-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
