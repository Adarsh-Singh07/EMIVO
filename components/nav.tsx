"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Heart, User, Search, Menu, X, Sparkles, TrendingUp, History, Tag, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_BRANDS } from "@/lib/data";
import { CheckoutDrawer } from "@/components/checkout-drawer";

export function Nav() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated AI understanding state
  const isAIThinking = searchQuery.length > 3 && searchQuery.length < 10;
  const showResults = searchQuery.length >= 10;

  return (
    <>
      <div className="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] py-1.5 px-4 text-center text-xs font-medium tracking-wide flex items-center justify-center gap-6">
        <span className="hidden sm:inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> 0% EMI Available</span>
        <span className="hidden sm:inline-block opacity-40">•</span>
        <span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Same Day Local Pickup</span>
        <span className="hidden md:inline-block opacity-40">•</span>
        <span className="hidden md:inline-flex items-center gap-1.5">Free Delivery Above ₹999</span>
      </div>

      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
        className="sticky top-0 z-40 w-full border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">
              EMIVO
            </Link>
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-[var(--color-secondary)]">
              <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors text-red-600 hover:text-red-700 font-semibold flex items-center gap-1">
                <Tag className="w-4 h-4" /> Deals
              </Link>
              
              {/* Fynode-Style Mega Menu */}
              <div className="group py-5">
                <Link href="/products" className="hover:text-[var(--color-foreground)] transition-colors">Mobiles</Link>
                
                <div className="absolute top-[calc(100%-1px)] left-0 w-full bg-white border-t border-[var(--color-border)] shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] translate-y-4 group-hover:translate-y-0 z-50">
                  <div className="container-emivo py-10">
                    <div className="grid grid-cols-12 gap-8">
                      
                      {/* Column 1: Links */}
                      <div className="col-span-2 space-y-6">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Top Brands</h4>
                          <ul className="space-y-3">
                            <li><Link href="/product/p_001" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">Apple iPhone</Link></li>
                            <li><Link href="/product/p_002" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">Samsung Galaxy</Link></li>
                            <li><Link href="/products" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">Google Pixel</Link></li>
                            <li><Link href="/products" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">OnePlus</Link></li>
                          </ul>
                        </div>
                      </div>

                      {/* Column 2: Accessories */}
                      <div className="col-span-2 space-y-6">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Accessories</h4>
                          <ul className="space-y-3">
                            <li><Link href="/products" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">MagSafe Cases</Link></li>
                            <li><Link href="/products" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">Wireless Chargers</Link></li>
                            <li><Link href="/products" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">Screen Protectors</Link></li>
                            <li><Link href="/products" className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">Power Banks</Link></li>
                          </ul>
                        </div>
                      </div>

                      {/* Column 3: Featured Product 1 */}
                      <div className="col-span-4 pl-8 border-l border-gray-100">
                        <Link href="/product/p_001" className="block group/item">
                          <div className="aspect-[4/3] rounded-2xl bg-[#F5F5F7] mb-4 overflow-hidden p-6 flex items-center justify-center relative">
                            <img 
                              src="https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1000&auto=format&fit=crop" 
                              alt="iPhone 16 Pro" 
                              className="w-full h-full object-contain mix-blend-multiply group-hover/item:scale-105 transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                            />
                            <div className="absolute top-4 left-4">
                              <span className="px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded-md">New</span>
                            </div>
                          </div>
                          <h4 className="font-bold text-lg text-gray-900 mb-1">iPhone 16 Pro</h4>
                          <p className="text-sm text-gray-500">Built for Apple Intelligence.</p>
                        </Link>
                      </div>

                      {/* Column 4: Featured Product 2 */}
                      <div className="col-span-4">
                        <Link href="/product/p_002" className="block group/item">
                          <div className="aspect-[4/3] rounded-2xl bg-[#F5F5F7] mb-4 overflow-hidden p-6 flex items-center justify-center">
                            <img 
                              src="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1000&auto=format&fit=crop" 
                              alt="Galaxy S25 Ultra" 
                              className="w-full h-full object-contain mix-blend-multiply group-hover/item:scale-105 transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                            />
                          </div>
                          <h4 className="font-bold text-lg text-gray-900 mb-1">Galaxy S25 Ultra</h4>
                          <p className="text-sm text-gray-500">Galaxy AI is here.</p>
                        </Link>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
              
              <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors">Laptops</Link>
              <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors">Audio</Link>
              <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors">Tablets</Link>
              <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors">Wearables</Link>
              
              <Link href="/" className="hover:text-[var(--color-foreground)] transition-colors flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-[var(--color-accent)]" /> AI Picks
              </Link>
            </div>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden md:block">
            <div 
              className="relative group cursor-pointer"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-secondary)] group-hover:text-[var(--color-foreground)] transition-colors" />
              <div className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-full)] py-2.5 pl-11 pr-4 text-sm text-[var(--color-secondary)] group-hover:border-[var(--color-foreground)] transition-colors shadow-sm">
                Search "Gaming laptop under 80k"...
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--color-secondary)] bg-[var(--color-border)]/50 rounded-[var(--radius-sm)]">
                  <span className="text-xs">⌘</span> K
                </kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="md:hidden p-2 text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </button>
            <Link href="/account" className="p-2 text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors">
              <Heart className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <Link href="/account" className="p-2 text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors">
              <User className="w-5 h-5" strokeWidth={1.5} />
            </Link>
            <button onClick={() => setIsCheckoutOpen(true)} className="p-2 text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors">
              <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.nav>

      <CheckoutDrawer isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />

      {/* AI Search Full Screen Overlay (Shopping-First) */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[var(--color-background)]/95 backdrop-blur-2xl flex flex-col pt-8 px-4 overflow-y-auto"
          >
            <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-20">
              
              <div className="text-center space-y-2 mb-4">
                <h2 className="text-3xl font-bold text-[var(--color-foreground)] tracking-tight">Describe what you need.</h2>
                <p className="text-[var(--color-secondary)]">We'll recommend products, compare options, and find the best EMI automatically.</p>
              </div>

              <div className="relative flex items-center group">
                <Search className="absolute left-6 w-6 h-6 text-[var(--color-secondary)] group-focus-within:text-[var(--color-accent)] transition-colors" />
                <input 
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., Best phone for mom under 3k EMI"
                  className="w-full bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-[var(--radius-lg)] py-6 pl-16 pr-16 text-2xl font-medium text-[var(--color-foreground)] placeholder:text-[var(--color-border)] shadow-xl focus:border-[var(--color-accent)] focus:outline-none transition-all"
                />
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-6 p-2 text-[var(--color-secondary)] hover:text-[var(--color-foreground)] transition-colors bg-[var(--color-border)]/50 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* AI Suggestion Chips */}
              {searchQuery.length === 0 && (
                <div className="flex flex-wrap justify-center gap-3">
                  {['Gaming Laptop', 'Photography', 'Student', 'Travel', 'Video Editing', 'Office Productivity'].map(chip => (
                    <button 
                      key={chip}
                      onClick={() => setSearchQuery(`Best products for ${chip}`)}
                      className="px-4 py-2 rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-secondary)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)] bg-[var(--color-surface)] transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Shopping Discovery (When Empty) */}
              {searchQuery.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-8">
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-foreground)]">
                      <History className="w-4 h-4 text-[var(--color-secondary)]" /> Recent Searches
                    </h3>
                    <div className="space-y-3">
                      <p className="text-[var(--color-secondary)] hover:text-[var(--color-foreground)] cursor-pointer transition-colors font-medium">Samsung vs Apple</p>
                      <p className="text-[var(--color-secondary)] hover:text-[var(--color-foreground)] cursor-pointer transition-colors font-medium">Sony ANC headphones</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-foreground)]">
                      <TrendingUp className="w-4 h-4 text-[var(--color-secondary)]" /> Trending Products
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-12 h-12 bg-[var(--color-surface)] rounded-[var(--radius-sm)] flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-accent)] transition-colors">Galaxy S25 Ultra</p>
                          <p className="text-xs text-[var(--color-secondary)]">From ₹3,999/mo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-12 h-12 bg-[var(--color-surface)] rounded-[var(--radius-sm)] flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-accent)] transition-colors">MacBook Air M4</p>
                          <p className="text-xs text-[var(--color-secondary)]">From ₹2,499/mo</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-foreground)]">
                      <Tag className="w-4 h-4 text-[var(--color-secondary)]" /> Popular Brands
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {MOCK_BRANDS.slice(0, 6).map(brand => (
                        <span key={brand} className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-xs font-medium text-[var(--color-secondary)] hover:text-[var(--color-foreground)] hover:border-[var(--color-foreground)] cursor-pointer transition-colors">
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Understanding State (Populated) */}
              <AnimatePresence>
                {searchQuery.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-sm border border-[var(--color-border)]"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className={`w-5 h-5 ${isAIThinking ? 'text-[var(--color-accent)] animate-pulse' : 'text-[var(--color-foreground)]'}`} />
                      <span className="text-sm font-semibold text-[var(--color-foreground)]">
                        {isAIThinking ? "Analyzing your requirements..." : "Top matches for your intent"}
                      </span>
                    </div>

                    {showResults ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-background)] hover:shadow-md cursor-pointer transition-all border border-[var(--color-border)] hover:border-[var(--color-accent)]">
                          <div className="w-20 h-20 bg-[var(--color-surface)] rounded-[var(--radius-sm)] flex-shrink-0" />
                          <div>
                            <p className="text-xs text-[var(--color-secondary)] uppercase tracking-widest font-semibold mb-1">ASUS</p>
                            <h4 className="font-bold text-lg text-[var(--color-foreground)]">ROG Zephyrus G16</h4>
                            <p className="text-sm font-medium mt-1">₹2,49,990 <span className="text-[var(--color-accent)] font-semibold ml-2">From ₹20,832/mo</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-background)] hover:shadow-md cursor-pointer transition-all border border-[var(--color-border)] hover:border-[var(--color-accent)]">
                          <div className="w-20 h-20 bg-[var(--color-surface)] rounded-[var(--radius-sm)] flex-shrink-0" />
                          <div>
                            <p className="text-xs text-[var(--color-secondary)] uppercase tracking-widest font-semibold mb-1">Lenovo</p>
                            <h4 className="font-bold text-lg text-[var(--color-foreground)]">ThinkPad X1 Carbon</h4>
                            <p className="text-sm font-medium mt-1">₹1,75,000 <span className="text-[var(--color-accent)] font-semibold ml-2">From ₹14,583/mo</span></p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50">
                         {[1,2,3,4].map(i => (
                           <div key={i} className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-[var(--color-border)] animate-pulse rounded-[var(--radius-sm)]" />
                             <div className="flex-1 space-y-2">
                               <div className="h-2 bg-[var(--color-border)] animate-pulse rounded w-full" />
                               <div className="h-2 bg-[var(--color-border)] animate-pulse rounded w-2/3" />
                             </div>
                           </div>
                         ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
