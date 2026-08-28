"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { HERO_SLIDES } from "@/lib/products";

const inr = (n?: number) => {
  if (typeof n !== "number") return "";
  return `₹${n.toLocaleString("en-IN")}`;
};

/**
 * Full-bleed promotional banner (Flipkart-style).
 * The product image is laid out as a full-width horizontal background and a
 * dark gradient keeps the headline legible on top — so it scales down to any
 * phone width without breaking layout.
 */
export default function HeroSlider({ slides = HERO_SLIDES }: { slides?: any[] }) {
  const [i, setI] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const activeSlides = slides.length > 0 ? slides : HERO_SLIDES;
  const n = activeSlides.length;

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);

    const onTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const dist = touchStart - touchEnd;
    const isLeftSwipe = dist > 50;
    const isRightSwipe = dist < -50;
    if (isLeftSwipe) setI((v) => (v + 1) % n);
    if (isRightSwipe) setI((v) => (v - 1 + n) % n);
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  const s = activeSlides[i];

  return (
    <section className="relative overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEndHandler}>
      <div className="relative bg-neutral-950">
        <Link href={s.link || "#"} className="block absolute inset-0 group">
        <img
          key={`bg-${s.id}`}
          src={s.img}
          alt=""
          fetchPriority={i === 0 ? "high" : "auto"}
          loading={i === 0 ? "eager" : "lazy"}
          className="absolute inset-0 w-full h-full object-cover animate-[fadeIn_0.7s_ease]"
        />
        {/* Legibility overlay — darker on the text side */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/20" />
      </Link>

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] pointer-events-none mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center min-h-[280px] sm:min-h-[440px] lg:min-h-[560px] py-6 sm:py-10">
            <div key={`t-${s.id}`} className="max-w-xl text-white pointer-events-auto">
              <span className="inline-block text-[10px] sm:text-xs uppercase tracking-[0.2em] text-white/70 mb-3 sm:mb-4">
                {s.eyebrow}
              </span>
              <h1 className="text-[24px] sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
                {s.title}
              </h1>
              <p className="mt-2 sm:mt-4 text-white/80 text-[13px] sm:text-lg max-w-md">{s.subtitle}</p>
              <div className="mt-4 sm:mt-5 flex items-baseline gap-2 sm:gap-3">
                <span className="text-xl sm:text-2xl font-semibold">{inr(s.price)}</span>
                <span className="text-white/60 line-through text-[13px] sm:text-base">{inr(s.mrp)}</span>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={s.link}
                  className="inline-flex items-center gap-2 h-10 px-5 sm:h-12 sm:px-6 rounded-full bg-white text-neutral-950 text-[13px] sm:text-sm font-medium hover:bg-neutral-100"
                >
                  {s.cta} <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 h-10 px-5 sm:h-12 sm:px-6 rounded-full border border-white/60 text-white text-[13px] sm:text-sm font-medium hover:bg-white/10"
                >
                  Browse All
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Arrows (desktop only) */}
        <button
          onClick={() => setI((v) => (v - 1 + n) % n)}
          className="hidden sm:grid absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 place-items-center rounded-full bg-white/85 backdrop-blur hover:bg-white shadow"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setI((v) => (v + 1) % n)}
          className="hidden sm:grid absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 place-items-center rounded-full bg-white/85 backdrop-blur hover:bg-white shadow"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {activeSlides.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              aria-label={`Go to slide ${k + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                k === i ? "w-8 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
