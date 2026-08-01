import Link from "next/link"
import { FOOTER_LINKS } from "@/lib/emivo-data"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface w-full mt-auto">
      <div className="container-emivo py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Info & Newsletter */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <Link href="/" className="inline-block">
                <span className="font-heading text-2xl font-bold tracking-tight text-primary">EMIVO</span>
              </Link>
              <p className="mt-4 text-secondary max-w-sm">
                India's AI-first electronics storefront. Premium gadgets, transparent pricing, instant EMI financing.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Subscribe to our newsletter</h4>
              <div className="flex w-full max-w-sm space-x-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex h-11 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Email for newsletter"
                />
                <Button>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Links */}
          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h4 className="font-semibold text-foreground mb-4">{group.title}</h4>
              <ul className="space-y-3 shrink-0">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-secondary hover:text-primary transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted text-center md:text-left">
            &copy; {new Date().getFullYear()} EMIVO. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-sm text-secondary bg-accent/10 px-3 py-1.5 rounded-full ring-1 ring-accent/20">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>AI-Driven Retail Demo</span>
          </div>
        </div>
      </div>
    </footer>
  )
}