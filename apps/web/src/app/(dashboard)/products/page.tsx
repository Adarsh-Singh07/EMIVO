import { Check, ArrowUpRight, Search, Plus, Filter, Package } from "lucide-react";
import Link from "next/link";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Products</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your products and their variants</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
            />
          </div>
          <Link href="/products/new" className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Placeholder Product Cards */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:shadow-md transition-all">
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <Package className="w-12 h-12 opacity-50" />
              </div>
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-white/90 dark:bg-gray-900/90 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">Product Name {i}</h3>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">$99.00</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                High quality product with multiple variants and options available.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Active
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  3 Variants
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
