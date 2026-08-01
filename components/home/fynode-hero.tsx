"use client";

/**
 * Fynode hero slider: full-bleed background image, eyebrow + headline +
 * CTA on the left, badge pill, prev/next arrows and dot navigation.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_SLIDES } from "@/lib/fynode";

export function FynodeHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % HERO_SLIDES.length),
      6000
    );
    return () => clearInterval(t);
  }, []);

  const go = (dir: number) =>
    setIndex((i) => (i + dir + HERO_SLIDES.length) % HERO_SLIDES.length);

  const slide = HERO_SLIDES[index];

  return (
    <section className="relative h-[72vh] min-h-[520px] overflow-hidden bg-[var(--color-foreground)] md:h-[78vh]">
      <AnimatePresence mode="wait">
        <motion.img
          key={slide.id}
          src={slide.image}
          alt={slide.title}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />

      <div className="container-fynode relative flex h-full items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ y: 26, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -26, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl text-white"
          >
            <span className="inline-block rounded-sm bg-[var(--color-fynode-accent)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              {slide.badge}
            </span>
            <p className="mt-6 text-[14px] font-semibold uppercase tracking-[0.2em] text-white/70">
              {slide.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              {slide.title}
            </h1>
            <p className="mt-4 max-w-md text-[16px] text-white/75">
              {slide.description}
            </p>
            <a
              href={slide.cta.href}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-sm bg-white px-8 text-[14px] font-bold uppercase tracking-wide text-[var(--color-foreground)] transition-transform hover:scale-[1.03]"
            >
              {slide.cta.label}
            </a>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrows */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous slide"
        className="absolute left-5 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 md:grid"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next slide"
        className="absolute right-5 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 md:grid"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {HERO_SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
