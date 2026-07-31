"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { StorySection, StoryBlock } from "@/types/product";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";

// -- Blocks --

function TextBlock({ block }: { block: StoryBlock }) {
  return (
    <div className={`max-w-3xl ${block.align === "center" ? "mx-auto text-center" : ""}`}>
      {block.title && <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{block.title}</h3>}
      {block.content && <p className="text-[var(--color-secondary)] text-lg md:text-xl leading-relaxed">{block.content}</p>}
    </div>
  );
}

function MediaBlock({ block }: { block: StoryBlock }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  
  // Parallax effect
  const y = useTransform(scrollYProgress, [0, 1], [50, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  
  const isGlow = block.animationType === "titanium-glow";
  const glowOpacity = useTransform(scrollYProgress, [0, 1], [0, 0.5]);

  if (!block.media || block.media.length === 0) return null;

  return (
    <motion.div ref={ref} style={{ y, scale, opacity }} className="relative w-full aspect-square md:aspect-video rounded-[2rem] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] mt-8">
      {isGlow && <motion.div style={{ opacity: glowOpacity }} className="absolute inset-0 bg-[var(--color-foreground)] z-10 mix-blend-overlay" />}
      <Image src={block.media[0].url} alt={block.media[0].alt} fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover" />
    </motion.div>
  );
}

function FeatureGrid({ block }: { block: StoryBlock }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  
  const xLeft = useTransform(scrollYProgress, [0, 1], [-50, 0]);
  const xRight = useTransform(scrollYProgress, [0, 1], [50, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

  if (!block.media || block.media.length < 2) return null;

  return (
    <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
      <motion.div style={{ x: xLeft, opacity }} className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
        <Image src={block.media[0].url} alt={block.media[0].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </motion.div>
      <motion.div style={{ x: xRight, opacity }} className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
        <Image src={block.media[1].url} alt={block.media[1].alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
      </motion.div>
    </div>
  );
}

// Block Dispatcher
function BlockRenderer({ block }: { block: StoryBlock }) {
  switch (block.type) {
    case "TextBlock": return <TextBlock block={block} />;
    case "MediaBlock": return <MediaBlock block={block} />;
    case "FeatureGrid": return <FeatureGrid block={block} />;
    default: return null;
  }
}

function SectionRenderer({ section }: { section: StorySection }) {
  return (
    <section id={section.id} className="pt-24 md:pt-32 flex flex-col items-center">
      <div className="w-full flex flex-col gap-6">
        {section.title && (
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-center px-4">{section.title}</h2>
        )}
        {section.blocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>
    </section>
  );
}

export function StoryEngine({ sections }: { sections: StorySection[] }) {
  const [activeSectionId, setActiveSectionId] = useState("");

  // Apple-style scroll spy progress
  useEffect(() => {
    const handleScroll = () => {
      let current = "";
      sections.forEach((section) => {
        const el = document.getElementById(section.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Active if the center of the element is near the center of the screen
          if (rect.top <= window.innerHeight * 0.6 && rect.bottom >= window.innerHeight * 0.4) {
            current = section.id;
          }
        }
      });
      if (current !== activeSectionId) setActiveSectionId(current);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections, activeSectionId]);

  if (!sections || sections.length === 0) return null;

  return (
    <div className="relative">
      
      {/* Scroll Progress Dot Navigation */}
      <div className="hidden lg:flex sticky top-32 z-40 justify-center w-full pb-8">
        <div className="bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)] rounded-full px-6 py-3 flex gap-6 shadow-[var(--shadow-sm)]">
          {sections.map((sec) => (
            <div key={sec.id} className={`text-[10px] font-bold uppercase tracking-[0.15em] transition-colors duration-500 flex items-center gap-2 ${activeSectionId === sec.id ? 'text-[var(--color-foreground)]' : 'text-[var(--color-secondary)]'}`}>
              <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${activeSectionId === sec.id ? 'bg-[var(--color-foreground)]' : 'bg-transparent'}`} />
              {sec.type}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-12">
        {sections.map((section) => (
          <SectionRenderer key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
