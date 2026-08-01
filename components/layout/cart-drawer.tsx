"use client"

import { useCartStore } from "@/lib/store/cart"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { LedgerFigure } from "@/components/ui/ledger-figure"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, Trash2, ShoppingBag, Truck, ShieldCheck, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

/** Free-shipping threshold in paisa (â‚¹999). */
const FREE_SHIPPING_THRESHOLD = 99900

export function CartDrawer() {
  const {
    isOpen, setIsOpen, items,
    removeItem, updateQuantity,
    getSubtotal, getEMISubtotal
  } = useCartStore()

  const subtotal = getSubtotal()
  const emiSubtotal = getEMISubtotal()
  const isEmpty = items.length === 0
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)

  // Free-shipping meter
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0">
        {/* Header */}
        <SheetHeader className="px-6 py-5 border-b border-border flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight">
            <ShoppingBag className="w-5 h-5 text-[var(--color-primary)]" />
            Cart
            {!isEmpty && (
              <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-bold">
                {totalItems}
              </Badge>
            )}
          </SheetTitle>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-1 rounded-md text-secondary hover:text-foreground hover:bg-background transition-colors"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </SheetHeader>

        {/* Free shipping meter */}
        {!isEmpty && (
          <div className="px-6 pt-5">
            <div className="flex items-center gap-1.5 text-xs">
              {remainingForFree > 0 ? (
                <span className="text-secondary">
                  Add <LedgerFigure paisa={remainingForFree} size="xs" noLine tone="navy" /> more for{" "}
                  <span className="font-semibold text-foreground">FREE shipping</span>
                </span>
              ) : (
                <span className="font-semibold text-success flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  You&apos;ve unlocked FREE shipping!
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-border/50 overflow-hidden" role="progressbar" aria-valuenow={shippingProgress} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full bg-[var(--color-success)] transition-all duration-500 ease-[var(--ease-premium)]"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-hide">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center text-muted border border-border">
                <ShoppingBag className="w-9 h-9" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-foreground">Your cart is empty</h3>
                <p className="text-secondary text-sm mt-1">Looks like you haven&apos;t added anything yet.</p>
              </div>
              <Button onClick={() => setIsOpen(false)} variant="outline" className="mt-4 rounded-lg">
                Continue Shopping
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3.5 rounded-xl border border-border bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/products/${item.product.id}`}
                    onClick={() => setIsOpen(false)}
                    className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-background border border-border"
                  >
                    <Image
                      src={item.product.gallery[0]?.url || "/placeholder.png"}
                      alt={item.product.title}
                      fill
                      sizes="80px"
                      className="object-contain p-2"
                    />
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
                          {item.product.brand}
                        </div>
                        <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground mt-0.5">
                          {item.product.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 -mt-1 -mr-1 text-muted hover:text-error transition-colors"
                        aria-label={`Remove ${item.product.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {item.selectedColor && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-secondary">
                        <span
                          className="w-3 h-3 rounded-full border border-border"
                          style={{ backgroundColor: item.selectedColor.hex || "#ccc" }}
                        />
                        {item.selectedColor.name}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2">
                      {/* Quantity stepper */}
                      <div className="flex items-center border border-border rounded-full">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 grid place-items-center text-secondary hover:text-foreground transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-medium tabular-nums text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 grid place-items-center text-secondary hover:text-foreground transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line total */}
                      <LedgerFigure paisa={item.product.basePrice * item.quantity} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary + actions */}
        {!isEmpty && (
          <div className="border-t border-border px-6 py-5 space-y-4 bg-[var(--color-surface-elevated)]/60">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Subtotal</span>
                <LedgerFigure paisa={subtotal} size="sm" noLine />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">Shipping</span>
                <span className="font-semibold text-success">FREE</span>
              </div>
              <div className="border-t border-dashed border-border pt-2.5 mt-2.5 flex items-center justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <LedgerFigure paisa={subtotal} size="md" />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <Button
                variant="accent"
                size="lg"
                className="w-full rounded-lg"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link href="/checkout" className="flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Checkout Safely
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-lg"
                asChild
                onClick={() => setIsOpen(false)}
              >
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>

            {/* EMI panel â€” EMIVO signature */}
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-accent)]/25 bg-[var(--color-accent)]/10 px-3.5 py-3">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Badge variant="emi" className="px-1.5 py-0 text-[10px]">EMI</Badge>
                Pay monthly
              </span>
              <LedgerFigure paisa={emiSubtotal} size="sm" tone="navy" suffix="/mo" />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

