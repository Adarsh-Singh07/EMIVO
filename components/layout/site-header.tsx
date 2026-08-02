"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Search, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { useCartStore } from "@/lib/store/cart"

const NAV_LINKS = [
  { href: "/products?category=headphones", label: "Headphones" },
  { href: "/products?category=earphones", label: "Earphones" },
  { href: "/products?category=speakers", label: "Speakers" },
  { href: "/products?category=microphones", label: "Microphones" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  // The cart store rehydrates from localStorage on the client. Until the
  // component is mounted, render no count so the server and client HTML match.
  const [mounted, setMounted] = useState(false)
  const cartItemCount = useCartStore((state) => state.getTotalItems())
  const toggleCart = useCartStore((state) => state.toggleCart)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="container-emivo flex h-16 items-center justify-between">
        
        {/* Mobile menu toggle & Logo */}
        <div className="flex items-center gap-4 md:gap-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden -ml-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
          
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <span className="font-heading text-xl font-bold tracking-tight text-primary">EMIVO</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? "text-primary" : "text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            aria-label="Cart" 
            className="relative"
            onClick={toggleCart}
          >
            <ShoppingBag className="h-5 w-5" />
            {mounted && cartItemCount > 0 && (
              <Badge
                variant="emi"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-surface absolute w-full left-0 shadow-elevated">
          <nav className="flex flex-col p-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`py-3 text-base font-medium border-b border-border/50 last:border-0 ${
                  pathname === link.href ? "text-primary" : "text-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}