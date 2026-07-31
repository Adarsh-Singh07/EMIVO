"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: "iphone-16-pro",
    theme: "light",
    bg: "bg-[#F5F5F7]",
    eyebrow: "Apple",
    title: "Titanium. So strong. So light. So Pro.",
    description: "The most advanced iPhone ever, featuring a revolutionary 48MP camera system and the A18 Pro chip.",
    price: "From ₹10,825/mo.",
    image: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1000&auto=format&fit=crop", 
    layout: "split-right-image", 
  },
  {
    id: "asus-rog",
    theme: "dark",
    bg: "bg-[#09090B]",
    eyebrow: "Republic of Gamers",
    title: "Rule them all.",
    description: "Desktop-class performance in a 14-inch chassis. The new ROG Zephyrus G14 is an absolute weapon.",
    price: "From ₹15,416/mo.",
    image: "https://dlcdnwebimgs.asus.com/gain/0D37AFED-41D1-46CB-8A97-0F142D305F86/w1000/h732", // high quality transparent
    layout: "split-left-image",
  },
  {
    id: "macbook-air",
    theme: "light",
    bg: "bg-white",
    eyebrow: "Apple",
    title: "Lean. Mean. M3 machine.",
    description: "Supercharged by M3, MacBook Air is up to 1.6x faster than M1. With up to 18 hours of battery life.",
    price: "From ₹6,383/mo.",
    image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800",
    layout: "split-right-image",
  }
];

export function Hero() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleDotClick = (index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  };

  const isDark = (theme: string) => theme === "dark" || theme === "cinematic";

  // Easing inspired by Apple Keynote
  const easePremium = [0.16, 1, 0.3, 1] as const;

  return (
    <section className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden bg-black">
      {/* 
        AnimatePresence without mode="wait" allows the incoming slide to animate in 
        WHILE the outgoing slide animates out. This prevents jump cuts. 
      */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={slides[current].id}
          custom={direction}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: easePremium }}
          className={`absolute inset-0 w-full h-full ${slides[current].bg} flex items-center justify-center`}
          style={{ zIndex: slides[current].id ? 10 : 0 }}
        >
          
          <div className="container-emivo relative z-10 flex flex-col md:flex-row items-center h-full gap-12 pt-20 pb-10">
            {/* Content Side */}
            <div className={`flex-1 flex flex-col justify-center ${slides[current].layout === "split-left-image" ? "md:order-2" : "md:order-1"}`}>
              
              <div className="overflow-hidden mb-4">
                <motion.span 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.8, ease: easePremium, delay: 0.1 }}
                  className={`text-[13px] font-bold tracking-[0.2em] uppercase block ${isDark(slides[current].theme) ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  {slides[current].eyebrow}
                </motion.span>
              </div>
              
              <div className="overflow-hidden mb-6">
                <motion.h1 
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-50%", opacity: 0 }}
                  transition={{ duration: 1, ease: easePremium, delay: 0.2 }}
                  className={`text-[56px] md:text-[80px] font-bold tracking-tight leading-[0.95] ${isDark(slides[current].theme) ? "text-white" : "text-black"}`}
                >
                  {slides[current].title}
                </motion.h1>
              </div>

              <div className="overflow-hidden mb-10">
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.8, ease: easePremium, delay: 0.3 }}
                  className={`text-[20px] leading-relaxed max-w-xl ${isDark(slides[current].theme) ? "text-gray-300" : "text-gray-600"}`}
                >
                  {slides[current].description}
                </motion.p>
              </div>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.8, ease: easePremium, delay: 0.4 }}
                className="flex items-center gap-6"
              >
                <Button 
                  variant="default" 
                  size="lg" 
                  className={`rounded-full px-8 py-6 text-base font-semibold ${isDark(slides[current].theme) ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-900"}`}
                >
                  Buy Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <span className={`font-semibold text-lg tabular-nums ${isDark(slides[current].theme) ? "text-white" : "text-black"}`}>
                  {slides[current].price}
                </span>
              </motion.div>
            </div>

            {/* Image Side */}
            <div className={`flex-1 h-full w-full relative flex items-center justify-center ${slides[current].layout === "split-left-image" ? "md:order-1" : "md:order-2"}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: direction * 100 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 1.1, x: direction * -100 }}
                transition={{ duration: 1.2, ease: easePremium, delay: 0.1 }}
                className="w-full max-w-2xl aspect-square relative flex items-center justify-center"
              >
                <img 
                  src={slides[current].image} 
                  alt={slides[current].title} 
                  className={`w-full h-full object-contain ${slides[current].bg === "bg-white" || slides[current].bg === "bg-[#F5F5F7]" ? "mix-blend-multiply" : ""}`} 
                />
              </motion.div>
            </div>

          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Custom Keynote Progress Pagination */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleDotClick(idx)}
            className="relative w-16 h-1 bg-white/20 rounded-full overflow-hidden transition-all duration-300 hover:bg-white/40 cursor-pointer"
            aria-label={`Go to slide ${idx + 1}`}
          >
            {/* Active Progress Bar Fill */}
            {idx === current && (
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
                className={`absolute top-0 left-0 h-full ${isDark(slides[current].theme) ? "bg-white" : "bg-black"}`}
              />
            )}
            {/* Completed Bar Fill */}
            {idx < current && (
               <div className={`absolute top-0 left-0 w-full h-full ${isDark(slides[current].theme) ? "bg-white" : "bg-black"}`} />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
