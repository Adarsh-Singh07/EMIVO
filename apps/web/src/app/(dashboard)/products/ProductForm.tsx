"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export function ProductForm() {
  const [variants, setVariants] = useState<
    Array<{
      id: string;
      name: string;
      sku: string;
      price: string;
      stock: string;
    }>
  >([{ id: "1", name: "Default", sku: "", price: "", stock: "" }]);

  const addVariant = () => {
    setVariants([
      ...variants,
      { id: Date.now().toString(), name: "", sku: "", price: "", stock: "" },
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(variants.filter((v) => v.id !== id));
    }
  };

  const updateVariant = (id: string, field: string, value: string) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)),
    );
  };

  return (
    <form className="space-y-8 max-w-4xl" onSubmit={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Add New Product
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create a new product with options and stock logic
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Save Product
          </button>
        </div>
      </div>

      {/* General Details */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          General Information
        </h3>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Product Title
          </label>
          <input
            type="text"
            placeholder="e.g. Wireless Ergonomic Keyboard"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            rows={4}
            placeholder="Detailed description of the product..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Media Upload Placeholder */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Product Images
        </h3>
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
          <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Click to upload images
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            SVG, PNG, JPG or GIF (max. 800x400px)
          </p>
        </div>
      </div>

      {/* Variants Logic */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Variants
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add options like size, color, or material
            </p>
          </div>
          <button
            type="button"
            onClick={addVariant}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Variant
          </button>
        </div>

        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={variant.id}
              className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <div className="flex-1 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Variant Name (e.g. Red / XL)"
                  value={variant.name}
                  onChange={(e) =>
                    updateVariant(variant.id, "name", e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="w-full sm:w-32">
                <input
                  type="text"
                  placeholder="SKU"
                  value={variant.sku}
                  onChange={(e) =>
                    updateVariant(variant.id, "sku", e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="w-full sm:w-28">
                <input
                  type="number"
                  placeholder="Price"
                  value={variant.price}
                  onChange={(e) =>
                    updateVariant(variant.id, "price", e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="w-full sm:w-24">
                <input
                  type="number"
                  placeholder="Stock"
                  value={variant.stock}
                  onChange={(e) =>
                    updateVariant(variant.id, "stock", e.target.value)
                  }
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariant(variant.id)}
                disabled={variants.length === 1}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
