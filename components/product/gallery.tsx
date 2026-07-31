"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Play, Rotate3D, X, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProduct } from "./product-context";

// A simple preloader function
const preloadImage = (url: string) => {
  if (typeof window !== "undefined") {
    const img = new window.Image();
    img.src = url;
  }
};

export function ProductGallery() {
  const { product, selectedColor, activeImageIndex, setActiveImageIndex } = useProduct();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(0);

  // Filter images by selectedColor if available, otherwise fallback to all
  const colorFilteredGallery = product.gallery.filter(m => !m.colorId || m.colorId === selectedColor);
  const activeGallery = colorFilteredGallery.length > 0 ? colorFilteredGallery : product.gallery;

  const currentIndex = Math.min(activeImageIndex, activeGallery.length - 1);
  const activeMedia = activeGallery[currentIndex];

  const navigate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    let newIndex = currentIndex + newDirection;
    if (newIndex < 0) newIndex = activeGallery.length - 1;
    if (newIndex >= activeGallery.length) newIndex = 0;
    setActiveImageIndex(newIndex);
  }, [currentIndex, activeGallery.length, setActiveImageIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, isFullscreen]);

  // Preload next/prev images
  useEffect(() => {
    if (!activeGallery || activeGallery.length === 0) return;
    const prev = currentIndex === 0 ? activeGallery.length - 1 : currentIndex - 1;
    const next = currentIndex === activeGallery.length - 1 ? 0 : currentIndex + 1;
    preloadImage(activeGallery[prev].url);
    preloadImage(activeGallery[next].url);
  }, [currentIndex, activeGallery]);

  if (!activeGallery || activeGallery.length === 0) return null;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div className="w-full space-y-4">
      {/* Main Showcase */}
      <div 
        className="relative w-full aspect-square md:aspect-[4/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm group cursor-zoom-in"
        onClick={() => setIsFullscreen(true)}
      >
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.3 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) navigate(1);
              else if (swipe > swipeConfidenceThreshold) navigate(-1);
            }}
            className="absolute inset-0 w-full h-full"
          >
            {activeMedia.type === "image" && (
              <Image 
                src={activeMedia.url} 
                alt={activeMedia.alt || product.title} 
                fill 
                sizes="(max-width: 1024px) 100vw, 50vw" 
                className="object-contain p-8 md:p-16 pointer-events-none mix-blend-multiply" 
                priority 
              />
            )}
            
            {activeMedia.type === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <Play className="w-16 h-16 text-[var(--color-foreground)] opacity-50" />
              </div>
            )}
            {activeMedia.type === "360" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <Rotate3D className="w-16 h-16 text-[var(--color-foreground)] opacity-50" />
              </div>
            )}
            {activeMedia.type === "AR" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                <span className="text-sm font-bold uppercase tracking-widest text-[var(--color-secondary)]">AR View</span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-4 right-4 bg-[var(--color-surface)]/80 backdrop-blur-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-5 h-5 text-[var(--color-foreground)]" />
        </div>
      </div>

      {/* Thumbnails */}
      {activeGallery.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
          {activeGallery.map((media, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setActiveImageIndex(idx);
              }}
              className={`relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 transition-all snap-start ${
                currentIndex === idx 
                  ? "border-[var(--color-foreground)] opacity-100 ring-2 ring-[var(--color-foreground)]/20 scale-105" 
                  : "border-transparent opacity-60 hover:opacity-100 hover:scale-95"
              }`}
            >
              <Image src={media.url} alt={media.alt} fill sizes="80px" className="object-contain p-2 mix-blend-multiply" />
              {media.type === "video" && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="w-6 h-6 text-white" /></div>}
              {media.type === "360" && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Rotate3D className="w-6 h-6 text-white" /></div>}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-background)]/95 backdrop-blur-xl"
          >
            <button 
              onClick={() => setIsFullscreen(false)}
              className="absolute top-8 right-8 p-4 bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] rounded-full transition-colors text-[var(--color-foreground)] z-50 shadow-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-full max-w-7xl max-h-[90vh] p-8 flex items-center justify-center">
               {activeMedia.type === "image" && (
                <Image src={activeMedia.url} alt={activeMedia.alt} fill sizes="100vw" className="object-contain" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
