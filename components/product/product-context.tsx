"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { Product } from "@/types/product";

interface ProductContextState {
  product: Product;
  selectedColor: string;
  selectedStorage: string;
  activeImageIndex: number;
  dynamicPrice: number;
  dynamicEMI: number;
  
  // Setters
  setSelectedColor: (id: string) => void;
  setSelectedStorage: (id: string) => void;
  setActiveImageIndex: (index: number) => void;
}

const ProductContext = createContext<ProductContextState | undefined>(undefined);

export function ProductProvider({ product, children }: { product: Product, children: ReactNode }) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]?.id || "");
  const [selectedStorage, setSelectedStorage] = useState(product.storageOptions[0]?.id || "");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { dynamicPrice, dynamicEMI } = useMemo(() => {
    const storageMod = product.storageOptions.find(s => s.id === selectedStorage)?.priceModifier || 0;
    const price = product.basePrice + storageMod;
    const emi = Math.round(product.baseEMI * (price / product.basePrice));
    return { dynamicPrice: price, dynamicEMI: emi };
  }, [product, selectedStorage]);

  const value = {
    product,
    selectedColor,
    selectedStorage,
    activeImageIndex,
    dynamicPrice,
    dynamicEMI,
    setSelectedColor,
    setSelectedStorage,
    setActiveImageIndex,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
}
