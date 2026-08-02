"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { getAllProducts, CATEGORIES } from "@/lib/emivo-data"
import { ProductCard } from "@/components/product-card"
import { Sparkles, SlidersHorizontal, ChevronDown } from "lucide-react"

function ProductListing() {
  const searchParams = useSearchParams()
  const categoryFilter = searchParams.get("category")
  
  let products = getAllProducts()
  
  if (categoryFilter) {
    products = products.filter(p => p.category === categoryFilter)
  }

  const currentCategoryLabel = CATEGORIES.find(c => c.slug === categoryFilter)?.name || "All Products"

  return (
    <div className="container-emivo py-12 md:py-16">
      
      {/* Header and Breadcrumb */}
      <div className="mb-10 flex flex-col gap-4">
        <h1 className="text-3xl md:text-5xl font-heading font-bold text-primary">
          {currentCategoryLabel}
        </h1>
        <p className="text-secondary max-w-2xl text-lg">
          Explore our premium selection of {currentCategoryLabel.toLowerCase()} with flexible EMI options to suit your lifestyle.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Filters Sidebar - Simplified for Demo */}
        <div className="w-full lg:w-64 shrink-0 bg-surface border border-border rounded-xl p-5 hidden lg:block sticky top-24">
          <div className="flex items-center gap-2 font-semibold mb-6 pb-4 border-b border-border">
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">Categories</h3>
              <ul className="space-y-2 text-sm text-secondary">
                <li>
                  <a href="/products" className={`hover:text-primary transition-colors ${!categoryFilter ? 'text-primary font-medium' : ''}`}>
                    All Products
                  </a>
                </li>
                {CATEGORIES.map(cat => (
                  <li key={cat.id}>
                    <a href={`/products?category=${cat.slug}`} className={`hover:text-primary transition-colors ${categoryFilter === cat.slug ? 'text-primary font-medium' : ''}`}>
                      {cat.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold mb-3">Sort By</h3>
              <div className="relative group bg-background border border-border rounded-md px-3 py-2 flex items-center justify-between text-sm cursor-pointer text-secondary">
                Recommended
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            
            <div className="pt-6 border-t border-border">
              <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-md">
                <Sparkles className="w-4 h-4 text-accent shrink-0" />
                <span className="text-xs text-primary font-medium">AI sorting is active. Products are ranked based on overall value and performance ratings.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 w-full">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-6 py-3 px-4 bg-surface border border-border rounded-md flex items-center justify-between">
             <span className="text-sm font-medium">{products.length} Products</span>
             <div className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
               <SlidersHorizontal className="w-4 h-4" />
               Filters
             </div>
          </div>
          
          {products.length === 0 ? (
            <div className="py-20 text-center border border-border border-dashed rounded-xl flex flex-col items-center">
              <p className="text-secondary text-lg">No products found in this category.</p>
              <a href="/products" className="text-primary font-medium mt-4 hover:underline">
                Clear all filters
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="container-emivo py-20 animate-pulse bg-background h-screen" />}>
      <ProductListing />
    </Suspense>
  )
}