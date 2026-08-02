"use client"

import Link from "next/link"
import Image from "next/image"
import { Product } from "@/types/product"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LedgerFigure } from "@/components/ui/ledger-figure"
import { useCartStore } from "@/lib/store/cart"
import { toast } from "sonner"
import { ShoppingBag, Star } from "lucide-react"

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigating to product detail
    addItem({
      product,
      quantity: 1,
      selectedColor: product.colors?.[0], // default to first color
    })
    toast.success(`${product.title} added to cart!`)
  }

  // Calculate discount percentage if MRP exists
  const discount = product.mrp > product.basePrice 
    ? Math.round(((product.mrp - product.basePrice) / product.mrp) * 100) 
    : 0

  return (
    <Link href={`/products/${product.id}`} className="group h-full flex">
      <Card className="flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:shadow-elevated hover:border-primary/20 bg-surface">
        
        {/* Top Badges overlay */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 sm:gap-1.5 z-10 w-fit">
          {product.isNew && (
            <Badge variant="ai" className="shadow-sm truncate flex-shrink-0 w-min">New</Badge>
          )}
          {discount > 0 && (
            <Badge variant="discount" className="shadow-sm w-min">{discount}% OFF</Badge>
          )}
        </div>
        
        {/* Image Box */}
        <CardHeader className="p-0 border-b border-border/50 bg-[#F5F6F8] relative aspect-square overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6 mix-blend-multiply">
             <Image
                src={product.gallery[0]?.url || "/placeholder.png"}
                alt={product.title}
                width={300}
                height={300}
                className="object-contain w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
              />
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col flex-1 p-3.5 pb-2 sm:p-5 sm:pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-eyebrow">{product.brand}</span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-secondary">
              <Star className="w-3 h-3 fill-accent text-accent" />
              {product.rating} <span className="opacity-60">({product.reviewsCount})</span>
            </div>
          </div>
          
          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 mb-3 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          
          <div className="mt-auto space-y-1">
            <div className="flex items-end gap-2 pr-2">
              <LedgerFigure paisa={product.basePrice} size="lg" />
              {product.mrp > product.basePrice && (
                <span className="text-xs text-muted line-through tabular-nums mb-[3px]">
                   ₹{Math.round(product.mrp / 100).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            
            {(product.baseEMI ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                From <LedgerFigure paisa={product.baseEMI ?? 0} size="xs" noLine tone="navy" suffix="/mo" />
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-3.5 pt-0 mt-2 sm:p-5">
          <Button 
            className="w-full h-9 rounded-md text-xs font-semibold bg-surface border-border text-foreground hover:bg-primary hover:border-primary hover:text-white transition-all shadow-sm"
            variant="outline"
            onClick={handleAddToCart}
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-2" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}